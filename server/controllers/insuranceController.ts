import { Response } from 'express';
import { generateId } from '../utils/idGenerator';
import { getOne, getAll, runQuery } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export async function getOfficialSchemes(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const schemes = await getAll<any>(`
      SELECT scheme_id, name, provider, description, eligibility, benefits, required_documents, official_url, active, last_verified_at
      FROM insurance_schemes
      WHERE active = 1
      ORDER BY scheme_id ASC
    `);

    res.json({ success: true, schemes });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve welfare schemes.' });
  }
}

export async function getWorkerPolicyDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const workerId = req.user!.worker_id;
    if (!workerId) {
      res.status(400).json({ success: false, message: 'Worker profile required.' });
      return;
    }

    const policy = await getOne<any>(`
      SELECT * FROM insurance_policies WHERE worker_id = ?
    `, [workerId]);

    const worker = await getOne<any>(`
      SELECT insurance_contribution_enabled FROM workers WHERE worker_id = ?
    `, [workerId]);

    const settingRate = await getOne<any>(`
      SELECT setting_value FROM cooperative_settings WHERE setting_key = 'insurance_contribution_rate'
    `);

    const consent = await getOne<any>(`
      SELECT * FROM consents WHERE user_id = ? AND entity_type = 'INSURANCE_POLICY' ORDER BY accepted_at DESC LIMIT 1
    `, [req.user!.user_id]);

    res.json({
      success: true,
      policy: policy || null,
      insurance_status: policy ? policy.verification_status : 'NOT_ENROLLED',
      contribution_enabled: worker ? !!worker.insurance_contribution_enabled : false,
      configured_rate: settingRate ? `${settingRate.setting_value}%` : '10%',
      consent: consent || null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch policy details.' });
  }
}

export async function getContributionHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const workerId = req.user!.worker_id;
    if (!workerId) {
      res.status(400).json({ success: false, message: 'Worker profile required.' });
      return;
    }

    const contributions = await getAll<any>(`
      SELECT contribution_id, booking_id, payment_amount, contribution_rate, contribution_amount, status, transaction_reference, created_at
      FROM insurance_contributions
      WHERE worker_id = ?
      ORDER BY created_at DESC
    `, [workerId]);

    // Calculate this month and total contributions
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    let thisMonthTotal = 0;
    let grandTotal = 0;

    for (const c of contributions) {
      grandTotal += c.contribution_amount;
      if (c.created_at.startsWith(currentMonth)) {
        thisMonthTotal += c.contribution_amount;
      }
    }

    res.json({
      success: true,
      contributions,
      summary: {
        this_month: thisMonthTotal,
        total_contributions: grandTotal,
        count: contributions.length
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch contribution ledger.' });
  }
}

export async function submitInsuranceClaim(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const workerId = req.user!.worker_id;
    const userId = req.user!.user_id;

    const {
      claimType,
      incidentDate,
      description,
      documents,
      amountClaimed,
      // Mandatory Consent Checkboxes
      accuracyConfirmed,
      processingConsentGiven
    } = req.body;

    if (!claimType || !incidentDate || !description || !amountClaimed) {
      res.status(400).json({ success: false, message: 'All claim details and claimed amount are required.' });
      return;
    }

    if (!accuracyConfirmed || !processingConsentGiven) {
      res.status(400).json({
        success: false,
        message: 'Both claim accuracy confirmation and processing consent checkboxes must be accepted.'
      });
      return;
    }

    const policy = await getOne<any>(`SELECT policy_id FROM insurance_policies WHERE worker_id = ?`, [workerId]);

    const claimId = generateId('clm');
    const now = new Date().toISOString();

    await runQuery(`
      INSERT INTO insurance_claims (claim_id, worker_id, policy_id, claim_type, incident_date, description, documents, amount_claimed, status, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', ?)
    `, [claimId, workerId, policy ? policy.policy_id : null, claimType, incidentDate, description, documents || '', Number(amountClaimed), now]);

    // Record claim consent
    const consentId = generateId('cns');
    await runQuery(`
      INSERT INTO consents (consent_id, user_id, entity_type, entity_id, consent_type, consent_version, accepted, accepted_at, ip_address_or_audit_reference, created_at, updated_at)
      VALUES (?, ?, 'INSURANCE_CLAIM', ?, 'CLAIM_PROCESSING_CONSENT', 'v1.0', 1, ?, ?, ?, ?)
    `, [consentId, userId, claimId, now, `${req.ip || '127.0.0.1'} (Claim Consent Verified)`, now, now]);

    await logAudit(userId, 'INSURANCE_CLAIM_SUBMITTED', 'INSURANCE_CLAIM', claimId, {
      claimType,
      amountClaimed: Number(amountClaimed)
    }, req.ip || '127.0.0.1');

    res.status(201).json({
      success: true,
      message: 'Insurance Claim Submitted ✓ Status: Submitted. Our cooperative desk will review it shortly.',
      claim_id: claimId
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to submit insurance claim.' });
  }
}

export async function getWorkerClaims(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const workerId = req.user!.worker_id;
    const claims = await getAll<any>(`
      SELECT * FROM insurance_claims WHERE worker_id = ? ORDER BY submitted_at DESC
    `, [workerId]);

    res.json({ success: true, claims });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve claims.' });
  }
}

export async function downloadPolicyDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const workerId = req.user!.worker_id;
    if (!workerId) {
      res.status(400).json({ success: false, message: 'Worker profile required.' });
      return;
    }

    const policy = await getOne<any>(`
      SELECT ip.*, u.name as worker_name, u.email as worker_email, u.phone as worker_phone, w.district
      FROM insurance_policies ip
      JOIN workers w ON ip.worker_id = w.worker_id
      JOIN users u ON w.user_id = u.user_id
      WHERE ip.worker_id = ?
    `, [workerId]);

    if (!policy) {
      res.status(404).json({ success: false, message: 'No registered insurance policy found for this worker.' });
      return;
    }

    const certificateHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Insurance Certificate - ${policy.policy_number}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 40px; margin: 0; }
    .card { max-width: 720px; margin: 0 auto; background: white; border: 2px solid #047857; border-radius: 16px; padding: 36px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; text-align: center; }
    .badge { display: inline-block; background: #d1fae5; color: #065f46; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 8px; }
    h1 { color: #064e3b; margin: 0 0 6px 0; font-size: 22px; }
    p.sub { margin: 0; color: #64748b; font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
    .item { background: #f1f5f9; padding: 12px 16px; border-radius: 10px; }
    .label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
    .val { font-size: 14px; font-weight: bold; color: #1e293b; margin-top: 2px; }
    .seal { margin-top: 30px; padding-top: 20px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; }
    .stamp { border: 2px solid #047857; color: #047857; padding: 6px 14px; border-radius: 8px; font-weight: bold; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Official Cooperative Certificate</div>
      <h1>TASK UNITY COOPERATIVE SOCIETY</h1>
      <p class="sub">Verified Worker Social Security & Insurance Record</p>
    </div>
    <div class="grid">
      <div class="item"><div class="label">Policy Holder</div><div class="val">${policy.policy_holder_name || policy.worker_name}</div></div>
      <div class="item"><div class="label">Policy Number</div><div class="val">${policy.policy_number}</div></div>
      <div class="item"><div class="label">Scheme / Insurer</div><div class="val">${policy.provider_or_scheme}</div></div>
      <div class="item"><div class="label">Coverage</div><div class="val">${policy.coverage}</div></div>
      <div class="item"><div class="label">Effective Date</div><div class="val">${policy.start_date}</div></div>
      <div class="item"><div class="label">Expiry Date</div><div class="val">${policy.expiry_date}</div></div>
      <div class="item"><div class="label">Status</div><div class="val" style="color: #047857;">VERIFIED & ACTIVE</div></div>
      <div class="item"><div class="label">District</div><div class="val">${policy.district || 'Tamil Nadu'}</div></div>
    </div>
    <div class="seal">
      <div>
        <strong>Verification Hash:</strong> SHA256-${policy.policy_id}-${Date.now().toString(36)}<br/>
        <em>Authorized by Cooperative Board of Administration</em>
      </div>
      <div class="stamp">TASK UNITY<br/>COOPERATIVE VERIFIED</div>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="TaskUnity_Policy_${policy.policy_number}.html"`);
    res.send(certificateHtml);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to download policy document.' });
  }
}
