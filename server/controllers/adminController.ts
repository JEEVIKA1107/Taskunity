import { Response } from 'express';
import { getOne, getAll, runQuery } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';
import { determineWorkerPendingStep } from './authController';

export async function getAdminOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const totalWorkersRow = await getOne<any>(`SELECT COUNT(*) as count FROM workers`);
    const activeWorkersRow = await getOne<any>(`SELECT COUNT(*) as count FROM worker_availability WHERE is_available = 1`);
    const totalCustomersRow = await getOne<any>(`SELECT COUNT(*) as count FROM customers`);
    const activeJobsRow = await getOne<any>(`SELECT COUNT(*) as count FROM bookings WHERE status IN ('ACCEPTED', 'WORKER_TRAVELLING', 'ARRIVED', 'SERVICE_IN_PROGRESS')`);
    const completedTodayRow = await getOne<any>(`SELECT COUNT(*) as count FROM bookings WHERE status = 'COMPLETED'`);
    const revenueRow = await getOne<any>(`SELECT COALESCE(SUM(service_amount), 0) as total FROM invoices WHERE status = 'PAID'`);
    const pendingVerificationsRow = await getOne<any>(`
      SELECT (
        (SELECT COUNT(*) FROM eshram_records WHERE verification_status IN ('PENDING', 'UNDER_REVIEW')) +
        (SELECT COUNT(*) FROM certifications WHERE verification_status IN ('PENDING', 'UNDER_REVIEW')) +
        (SELECT COUNT(*) FROM insurance_policies WHERE verification_status IN ('PENDING', 'UNDER_REVIEW')) +
        (SELECT COUNT(*) FROM workers WHERE onboarding_status = 'COOPERATIVE_PENDING')
      ) as total
    `);
    const insuranceActiveRow = await getOne<any>(`SELECT COUNT(*) as count FROM insurance_policies WHERE verification_status = 'VERIFIED'`);
    const insuranceExpiringRow = await getOne<any>(`SELECT COUNT(*) as count FROM insurance_policies WHERE verification_status = 'VERIFIED' AND date(expiry_date) <= date('now', '+30 days')`);
    const openComplaintsRow = await getOne<any>(`SELECT COUNT(*) as count FROM complaints WHERE status IN ('Submitted', 'Assigned', 'Under Review', 'Waiting for Information')`);
    const claimsCountRow = await getOne<any>(`SELECT COUNT(*) as count FROM insurance_claims WHERE status IN ('Submitted', 'Under Review', 'Documents Required')`);

    // Pure database driven operational metrics (zero hardcoded numbers)
    const stats = {
      total_workers: totalWorkersRow?.count || 0,
      workers_online: activeWorkersRow?.count || 0,
      active_jobs: activeJobsRow?.count || 0,
      completed_today: completedTodayRow?.count || 0,
      total_customers: totalCustomersRow?.count || 0,
      revenue: revenueRow?.total || 0,
      pending_verification: pendingVerificationsRow?.total || 0,
      insurance_active: insuranceActiveRow?.count || 0,
      insurance_expiring: insuranceExpiringRow?.count || 0,
      open_complaints: openComplaintsRow?.count || 0,
      claims_count: claimsCountRow?.count || 0
    };

    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin overview.' });
  }
}

export async function getWorkersList(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { skill, district, status, search } = req.query;

    let query = `
      SELECT w.*, u.name, u.email, u.phone, u.language, u.account_status as user_account_status,
             sk.name as skill_name, sk.category as skill_category,
             va.is_available, va.location_sharing_enabled,
             es.verification_status as eshram_status, es.eshram_number,
             ct.verification_status as cert_status, ct.certificate_number,
             ip.verification_status as insurance_status, ip.policy_number, ip.provider_or_scheme,
             (SELECT COUNT(*) FROM insurance_contributions ic WHERE ic.worker_id = w.worker_id) as contribution_count,
             (SELECT COALESCE(SUM(ic.contribution_amount), 0) FROM insurance_contributions ic WHERE ic.worker_id = w.worker_id) as total_contributions,
             (SELECT COALESCE(SUM(inv.net_earnings), 0) FROM invoices inv WHERE inv.worker_id = w.worker_id AND inv.status = 'PAID') as net_earnings
      FROM workers w
      JOIN users u ON w.user_id = u.user_id
      LEFT JOIN skills sk ON w.primary_skill_id = sk.skill_id
      LEFT JOIN worker_availability va ON w.worker_id = va.worker_id
      LEFT JOIN eshram_records es ON w.worker_id = es.worker_id
      LEFT JOIN certifications ct ON w.worker_id = ct.worker_id
      LEFT JOIN insurance_policies ip ON w.worker_id = ip.worker_id
      WHERE 1=1
    `;

    const params: any[] = [];
    if (skill) {
      query += ` AND w.primary_skill_id = ?`;
      params.push(skill);
    }
    if (district) {
      query += ` AND w.district = ?`;
      params.push(district);
    }
    if (status) {
      query += ` AND w.onboarding_status = ?`;
      params.push(status);
    }
    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY w.created_at DESC`;

    const workers = await getAll<any>(query, params);

    // Compute pending step for each worker
    for (const worker of workers) {
      worker.pending_step = await determineWorkerPendingStep(worker.worker_id);
    }

    res.json({ success: true, workers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch workers list.' });
  }
}

export async function verifyEshram(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { eshramId } = req.params;
    const { status, rejectionReason, notes } = req.body; // VERIFIED, REJECTED

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      res.status(400).json({ success: false, message: 'Status must be VERIFIED or REJECTED.' });
      return;
    }

    const eshram = await getOne<any>(`SELECT * FROM eshram_records WHERE eshram_id = ? OR worker_id = ?`, [eshramId, eshramId]);
    if (!eshram) {
      res.status(404).json({ success: false, message: 'e-Shram record not found.' });
      return;
    }

    const now = new Date().toISOString();
    await runQuery(`
      UPDATE eshram_records
      SET verification_status = ?, rejection_reason = ?, verified_by = ?, verified_at = ?
      WHERE eshram_id = ?
    `, [status, status === 'REJECTED' ? (rejectionReason || 'Document unreadable or mismatch.') : null, req.user!.user_id, now, eshram.eshram_id]);

    // Update worker onboarding status
    if (status === 'VERIFIED') {
      await runQuery(`
        UPDATE workers SET onboarding_status = 'SKILL_CERTIFICATION_PENDING', updated_at = ? WHERE worker_id = ?
      `, [now, eshram.worker_id]);
    } else {
      await runQuery(`
        UPDATE workers SET onboarding_status = 'ESHRAM_REJECTED', updated_at = ? WHERE worker_id = ?
      `, [now, eshram.worker_id]);
    }

    await logAudit(req.user!.user_id, 'ESHRAM_VERIFIED_BY_ADMIN', 'ESHRAM', eshram.eshram_id, { status, rejectionReason }, req.ip || '127.0.0.1');

    res.json({ success: true, message: `e-Shram record status updated to ${status}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to verify e-Shram record.' });
  }
}

export async function verifyCertification(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { certId } = req.params;
    const { status, rejectionReason } = req.body; // VERIFIED, REJECTED

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      res.status(400).json({ success: false, message: 'Status must be VERIFIED or REJECTED.' });
      return;
    }

    const cert = await getOne<any>(`SELECT * FROM certifications WHERE certification_id = ? OR worker_id = ?`, [certId, certId]);
    if (!cert) {
      res.status(404).json({ success: false, message: 'Certification record not found.' });
      return;
    }

    const now = new Date().toISOString();
    await runQuery(`
      UPDATE certifications
      SET verification_status = ?, rejection_reason = ?, verified_by = ?, verified_at = ?
      WHERE certification_id = ?
    `, [status, status === 'REJECTED' ? (rejectionReason || 'Certificate document mismatch.') : null, req.user!.user_id, now, cert.certification_id]);

    if (status === 'VERIFIED') {
      await runQuery(`
        UPDATE workers SET onboarding_status = 'INSURANCE_DECISION_PENDING', updated_at = ? WHERE worker_id = ?
      `, [now, cert.worker_id]);
    } else {
      await runQuery(`
        UPDATE workers SET onboarding_status = 'CERTIFICATION_REJECTED', updated_at = ? WHERE worker_id = ?
      `, [now, cert.worker_id]);
    }

    await logAudit(req.user!.user_id, 'CERTIFICATION_VERIFIED_BY_ADMIN', 'CERTIFICATION', cert.certification_id, { status, rejectionReason }, req.ip || '127.0.0.1');

    res.json({ success: true, message: `Certification record status updated to ${status}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to verify certification.' });
  }
}

export async function verifyInsurance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { policyId } = req.params;
    const { status, rejectionReason } = req.body; // VERIFIED, REJECTED, REQUEST_CORRECTION

    if (!['VERIFIED', 'REJECTED', 'UNDER_REVIEW'].includes(status)) {
      res.status(400).json({ success: false, message: 'Valid insurance verification status required.' });
      return;
    }

    const policy = await getOne<any>(`SELECT * FROM insurance_policies WHERE policy_id = ? OR worker_id = ?`, [policyId, policyId]);
    if (!policy) {
      res.status(404).json({ success: false, message: 'Policy not found.' });
      return;
    }

    const now = new Date().toISOString();
    await runQuery(`
      UPDATE insurance_policies
      SET verification_status = ?, rejection_reason = ?, verified_by = ?, verified_at = ?, updated_at = ?
      WHERE policy_id = ?
    `, [status, status === 'REJECTED' ? (rejectionReason || 'Policy document unclear.') : null, req.user!.user_id, now, now, policy.policy_id]);

    if (status === 'VERIFIED') {
      // Once verified, worker can now make the Insurance Contribution choice!
      await runQuery(`
        UPDATE workers SET onboarding_status = 'INSURANCE_CONTRIBUTION_PENDING', updated_at = ? WHERE worker_id = ?
      `, [now, policy.worker_id]);
    } else if (status === 'REJECTED') {
      await runQuery(`
        UPDATE workers SET onboarding_status = 'INSURANCE_REJECTED', updated_at = ? WHERE worker_id = ?
      `, [now, policy.worker_id]);
    }

    await logAudit(req.user!.user_id, 'INSURANCE_VERIFIED_BY_ADMIN', 'INSURANCE_POLICY', policyId, { status, rejectionReason }, req.ip || '127.0.0.1');

    res.json({
      success: true,
      message: `Insurance policy updated to ${status}.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to verify insurance.' });
  }
}

export async function cooperativeApproval(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { workerId } = req.params;
    const { action, notes } = req.body; // APPROVE, REJECT, REQUEST_CORRECTION

    const worker = await getOne<any>(`SELECT * FROM workers WHERE worker_id = ?`, [workerId]);
    if (!worker) {
      res.status(404).json({ success: false, message: 'Worker profile not found.' });
      return;
    }

    // Verify prerequisites: e-Shram must be verified, Certification must be verified
    const eshram = await getOne<any>(`SELECT verification_status FROM eshram_records WHERE worker_id = ?`, [workerId]);
    const cert = await getOne<any>(`SELECT verification_status FROM certifications WHERE worker_id = ?`, [workerId]);

    if (!eshram || eshram.verification_status !== 'VERIFIED') {
      res.status(400).json({ success: false, message: 'e-Shram verification must be completed before cooperative approval.' });
      return;
    }

    if (!cert || cert.verification_status !== 'VERIFIED') {
      res.status(400).json({ success: false, message: 'Skill certification must be verified before cooperative approval.' });
      return;
    }

    const now = new Date().toISOString();

    if (action === 'APPROVE') {
      await runQuery(`UPDATE workers SET onboarding_status = 'ACTIVE', updated_at = ? WHERE worker_id = ?`, [now, workerId]);
      await runQuery(`UPDATE users SET account_status = 'ACTIVE', updated_at = ? WHERE user_id = ?`, [now, worker.user_id]);
      await runQuery(`UPDATE worker_availability SET is_available = 1, last_status_change = ? WHERE worker_id = ?`, [now, workerId]);

      await logAudit(req.user!.user_id, 'WORKER_COOPERATIVE_ACTIVATED', 'WORKER', workerId, { notes }, req.ip || '127.0.0.1');

      res.json({
        success: true,
        message: 'Worker Activated Successfully ✓ Full access to Worker Dashboard granted.',
        status: 'ACTIVE'
      });
    } else {
      await runQuery(`UPDATE workers SET onboarding_status = 'COOPERATIVE_REJECTED', updated_at = ? WHERE worker_id = ?`, [now, workerId]);
      await logAudit(req.user!.user_id, 'WORKER_COOPERATIVE_REJECTED', 'WORKER', workerId, { notes }, req.ip || '127.0.0.1');

      res.json({
        success: true,
        message: 'Worker application rejected / correction requested.',
        status: 'COOPERATIVE_REJECTED'
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to process cooperative approval.' });
  }
}

export async function getInsuranceManagement(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const policies = await getAll<any>(`
      SELECT ip.*, w.years_experience, u.name as worker_name, u.email as worker_email, u.phone as worker_phone,
             sk.name as skill_name,
             c.consent_type, c.accepted_at as consent_timestamp, c.ip_address_or_audit_reference as consent_audit
      FROM insurance_policies ip
      JOIN workers w ON ip.worker_id = w.worker_id
      JOIN users u ON w.user_id = u.user_id
      LEFT JOIN skills sk ON w.primary_skill_id = sk.skill_id
      LEFT JOIN consents c ON c.user_id = u.user_id AND c.entity_id = ip.policy_id
      ORDER BY ip.created_at DESC
    `);

    const skippedWorkers = await getAll<any>(`
      SELECT w.worker_id, u.name, u.phone, u.email, sk.name as skill_name, w.onboarding_status
      FROM workers w
      JOIN users u ON w.user_id = u.user_id
      LEFT JOIN skills sk ON w.primary_skill_id = sk.skill_id
      WHERE w.onboarding_status = 'INSURANCE_SKIPPED'
    `);

    const claims = await getAll<any>(`
      SELECT ic.*, u.name as worker_name, u.phone as worker_phone, sk.name as skill_name,
             ip.policy_number, ip.provider_or_scheme
      FROM insurance_claims ic
      JOIN workers w ON ic.worker_id = w.worker_id
      JOIN users u ON w.user_id = u.user_id
      LEFT JOIN skills sk ON w.primary_skill_id = sk.skill_id
      LEFT JOIN insurance_policies ip ON ic.policy_id = ip.policy_id
      ORDER BY ic.submitted_at DESC
    `);

    const ledger = await getAll<any>(`
      SELECT l.*, u.name as worker_name, ic.payment_amount, ic.contribution_rate
      FROM insurance_fund_ledger l
      JOIN workers w ON l.worker_id = w.worker_id
      JOIN users u ON w.user_id = u.user_id
      LEFT JOIN insurance_contributions ic ON l.contribution_id = ic.contribution_id
      ORDER BY l.created_at DESC
    `);

    const settingRate = await getOne<any>(`SELECT setting_value FROM cooperative_settings WHERE setting_key = 'insurance_contribution_rate'`);

    res.json({
      success: true,
      data: {
        policies,
        skipped_workers: skippedWorkers,
        claims,
        ledger,
        current_rate: settingRate ? settingRate.setting_value : '10'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch insurance management data.' });
  }
}

export async function updateContributionRate(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { rate } = req.body;
    const numRate = Number(rate);

    if (isNaN(numRate) || numRate < 0 || numRate > 50) {
      res.status(400).json({ success: false, message: 'Contribution rate must be a valid percentage between 0 and 50%.' });
      return;
    }

    const now = new Date().toISOString();
    await runQuery(`
      UPDATE cooperative_settings
      SET setting_value = ?, updated_by = ?, updated_at = ?
      WHERE setting_key = 'insurance_contribution_rate'
    `, [numRate.toString(), req.user!.email, now]);

    await logAudit(req.user!.user_id, 'CONTRIBUTION_RATE_CHANGED', 'SETTING', 'insurance_contribution_rate', { newRate: `${numRate}%` }, req.ip || '127.0.0.1');

    res.json({
      success: true,
      message: `Insurance contribution rate updated to ${numRate}% successfully.`,
      rate: numRate
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update contribution rate.' });
  }
}

export async function getLiveWorkerMap(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { skill, state, area } = req.query;

    let query = `
      SELECT wl.*, w.worker_id, u.name, u.phone, sk.name as skill_name,
             w.rating, w.jobs_completed, va.is_available, va.location_sharing_enabled,
             b.booking_id, b.problem_title as active_job_title
      FROM worker_locations wl
      JOIN workers w ON wl.worker_id = w.worker_id
      JOIN users u ON w.user_id = u.user_id
      LEFT JOIN skills sk ON w.primary_skill_id = sk.skill_id
      LEFT JOIN worker_availability va ON w.worker_id = va.worker_id
      LEFT JOIN bookings b ON wl.booking_id = b.booking_id
      WHERE w.onboarding_status = 'ACTIVE'
        AND (va.location_sharing_enabled = 1 OR wl.location_state IN ('TRAVELLING_TO_CUSTOMER', 'ARRIVED', 'SERVICE_IN_PROGRESS'))
    `;

    const params: any[] = [];
    if (skill) {
      query += ` AND w.primary_skill_id = ?`;
      params.push(skill);
    }
    if (state) {
      query += ` AND wl.location_state = ?`;
      params.push(state);
    }

    const activeWorkers = await getAll<any>(query, params);

    res.json({ success: true, workers: activeWorkers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch live worker map.' });
  }
}

export async function getAiDemandForecasting(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const forecasts = await getAll<any>(`
      SELECT * FROM demand_forecast ORDER BY confidence_score DESC
    `);

    res.json({
      success: true,
      forecasts,
      meta: {
        engine: 'Rule-based historical demand estimation (AI/ML Architecture Ready)',
        data_sources: ['Historical Bookings', 'District Weather & Monsoon Indicators', 'Seasonal Category Trends', 'Active Worker Capacity']
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch demand forecasts.' });
  }
}

export async function getAiWorkforceAllocation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const allocations = await getAll<any>(`
      SELECT * FROM worker_allocation ORDER BY deficit DESC
    `);

    res.json({
      success: true,
      allocations,
      note: 'Recommendations provide predictive optimization. Workers are never moved without cooperative consent and voluntary incentive opt-in.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch workforce allocations.' });
  }
}

export async function getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const logs = await getAll<any>(`
      SELECT l.*, u.email as user_email, u.role as user_role
      FROM audit_logs l
      LEFT JOIN users u ON l.user_id = u.user_id
      ORDER BY l.created_at DESC
      LIMIT 100
    `);

    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
}

export async function updateClaimStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { claimId } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = ['Submitted', 'Under Review', 'Documents Required', 'Approved', 'Rejected', 'Settled', 'Closed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid claim status.' });
      return;
    }

    const now = new Date().toISOString();
    await runQuery(`
      UPDATE insurance_claims
      SET status = ?, admin_notes = ?, resolved_at = ?
      WHERE claim_id = ?
    `, [status, adminNotes || '', status === 'Settled' || status === 'Closed' ? now : null, claimId]);

    await logAudit(req.user!.user_id, 'CLAIM_STATUS_UPDATED', 'INSURANCE_CLAIM', claimId, { status }, req.ip || '127.0.0.1');

    res.json({ success: true, message: `Claim status updated to ${status}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update claim status.' });
  }
}

export async function getAdminClaims(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const claims = await getAll<any>(`
      SELECT ic.*, u.name as worker_name, u.phone as worker_phone, sk.name as skill_name,
             ip.policy_number, ip.provider_or_scheme
      FROM insurance_claims ic
      JOIN workers w ON ic.worker_id = w.worker_id
      JOIN users u ON w.user_id = u.user_id
      LEFT JOIN skills sk ON w.primary_skill_id = sk.skill_id
      LEFT JOIN insurance_policies ip ON ic.policy_id = ip.policy_id
      ORDER BY ic.submitted_at DESC
    `);

    res.json({ success: true, claims });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch claims list.' });
  }
}
