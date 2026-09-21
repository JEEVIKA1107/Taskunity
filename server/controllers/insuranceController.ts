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
