import { Response } from 'express';
import { generateId } from '../utils/idGenerator';
import { getOne, getAll, runQuery, saveDb } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';
import { determineWorkerPendingStep } from './authController';

export async function getOnboardingStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const workerId = req.user!.worker_id;
    if (!workerId) {
      res.status(400).json({ success: false, message: 'Worker profile not found.' });
      return;
    }

    const worker = await getOne<any>(`SELECT * FROM workers WHERE worker_id = ?`, [workerId]);
    const user = await getOne<any>(`SELECT * FROM users WHERE user_id = ?`, [req.user!.user_id]);
    const eshram = await getOne<any>(`SELECT * FROM eshram_records WHERE worker_id = ?`, [workerId]);
    const cert = await getOne<any>(`SELECT * FROM certifications WHERE worker_id = ?`, [workerId]);
    const policy = await getOne<any>(`SELECT * FROM insurance_policies WHERE worker_id = ?`, [workerId]);
    const consent = await getOne<any>(`SELECT * FROM consents WHERE user_id = ? ORDER BY accepted_at DESC LIMIT 1`, [req.user!.user_id]);

    const pendingStep = await determineWorkerPendingStep(workerId);

    res.json({
      success: true,
      data: {
        worker,
        user,
        eshram,
        cert,
        policy,
        consent,
        pending_step: pendingStep
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve onboarding state.' });
  }
}

export async function submitBasicProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const workerId = req.user!.worker_id;
    const userId = req.user!.user_id;

    const {
      name,
      phone,
      dob,
      gender,
      address,
      district,
      state,
      profilePhoto,
      primarySkillId,
      secondarySkills,
      yearsExperience,
      preferredWorkingArea,
      languagePreference
    } = req.body;

    if (!dob || !gender || !address || !district || !state || !primarySkillId) {
      res.status(400).json({ success: false, message: 'Please provide all mandatory basic profile fields.' });
      return;
    }

    const now = new Date().toISOString();

    // Update user info
    await runQuery(`
      UPDATE users 
      SET name = COALESCE(?, name), phone = COALESCE(?, phone), language = COALESCE(?, language), updated_at = ?
      WHERE user_id = ?
    `, [name, phone, languagePreference, now, userId]);

    // Update worker info
    const secSkillsJson = Array.isArray(secondarySkills) ? JSON.stringify(secondarySkills) : (secondarySkills || '[]');
    await runQuery(`
      UPDATE workers
      SET dob = ?, gender = ?, address = ?, district = ?, state = ?, profile_photo = ?,
          primary_skill_id = ?, secondary_skills = ?, years_experience = ?,
          preferred_working_area = ?, onboarding_status = 'ESHRAM_PENDING', updated_at = ?
      WHERE worker_id = ?
    `, [dob, gender, address, district, state, profilePhoto || '', primarySkillId, secSkillsJson, Number(yearsExperience) || 0, preferredWorkingArea || district, now, workerId]);

    // Upsert primary skill in worker_skills
    const existingPrimary = await getOne<any>(`SELECT id FROM worker_skills WHERE worker_id = ? AND is_primary = 1`, [workerId]);
    if (existingPrimary) {
      await runQuery(`UPDATE worker_skills SET skill_id = ?, years_experience = ? WHERE id = ?`, [primarySkillId, Number(yearsExperience) || 0, existingPrimary.id]);
    } else {
      await runQuery(`INSERT INTO worker_skills (id, worker_id, skill_id, is_primary, years_experience) VALUES (?, ?, ?, 1, ?)`, [generateId('ws'), workerId, primarySkillId, Number(yearsExperience) || 0]);
    }

    // Save secondary skills into worker_skills
    if (Array.isArray(secondarySkills)) {
      await runQuery(`DELETE FROM worker_skills WHERE worker_id = ? AND is_primary = 0`, [workerId]);
      for (const sSkill of secondarySkills) {
        const skillRec = await getOne<any>(`SELECT skill_id FROM skills WHERE skill_id = ? OR name = ?`, [sSkill, sSkill]);
        if (skillRec && skillRec.skill_id !== primarySkillId) {
          await runQuery(`INSERT INTO worker_skills (id, worker_id, skill_id, is_primary, years_experience) VALUES (?, ?, ?, 0, ?)`, [generateId('ws'), workerId, skillRec.skill_id, Number(yearsExperience) || 0]);
        }
      }
    }

    await logAudit(userId, 'WORKER_BASIC_PROFILE_SUBMITTED', 'WORKER', workerId, { district, primarySkillId }, req.ip || '127.0.0.1');

    res.json({
      success: true,
      message: 'Basic Profile Saved Successfully. Proceed to e-Shram verification.',
      next_step: 'ESHRAM'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to save basic profile.' });
  }
}

export async function submitEshram(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const workerId = req.user!.worker_id;
    const userId = req.user!.user_id;
    const { isRegistered, eshramNumber, holderName, documentUrl } = req.body;

    const isReg = isRegistered === true || isRegistered === 1 || isRegistered === 'true';
    const now = new Date().toISOString();

    if (isReg) {
      if (!eshramNumber || !documentUrl) {
        res.status(400).json({ success: false, message: 'e-Shram Number and document proof are mandatory.' });
        return;
      }
    }

    const existing = await getOne<any>(`SELECT eshram_id FROM eshram_records WHERE worker_id = ?`, [workerId]);
    const eshramId = existing ? existing.eshram_id : generateId('esh');

    if (existing) {
      await runQuery(`
        UPDATE eshram_records
        SET is_registered = ?, eshram_number = ?, holder_name = ?, document_url = ?, verification_status = 'PENDING', rejection_reason = NULL, created_at = ?
        WHERE eshram_id = ?
      `, [isReg ? 1 : 0, eshramNumber || '', holderName || req.user!.name, documentUrl || '', now, eshramId]);
    } else {
      await runQuery(`
        INSERT INTO eshram_records (eshram_id, worker_id, is_registered, eshram_number, holder_name, document_url, verification_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
      `, [eshramId, workerId, isReg ? 1 : 0, eshramNumber || '', holderName || req.user!.name, documentUrl || '', now]);
    }

    await runQuery(`UPDATE workers SET onboarding_status = 'ESHRAM_UNDER_REVIEW', updated_at = ? WHERE worker_id = ?`, [now, workerId]);

    await logAudit(userId, 'ESHRAM_SUBMISSION', 'ESHRAM', eshramId, { isRegistered: isReg, eshramNumber }, req.ip || '127.0.0.1');

    res.json({
      success: true,
      message: 'e-Shram document submitted for admin verification. Status: PENDING.',
      status: 'PENDING',
      next_step: 'ESHRAM_WAITING_VERIFICATION'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to submit e-Shram record.' });
  }
}

export async function submitSkillCertification(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const workerId = req.user!.worker_id;
    const userId = req.user!.user_id;

    const {
      primarySkill,
      certificationName,
      certificateNumber,
      issuingOrg,
      issueDate,
      expiryDate,
      documentUrl,
      yearsExperience
    } = req.body;

    if (!primarySkill || !certificationName || !certificateNumber || !issuingOrg || !issueDate || !documentUrl) {
      res.status(400).json({ success: false, message: 'All skill certification fields and certificate upload are mandatory.' });
      return;
    }

    const now = new Date().toISOString();
    const existing = await getOne<any>(`SELECT certification_id FROM certifications WHERE worker_id = ?`, [workerId]);
    const certId = existing ? existing.certification_id : generateId('cert');

    if (existing) {
      await runQuery(`
        UPDATE certifications
        SET primary_skill = ?, certification_name = ?, certificate_number = ?, issuing_org = ?,
            issue_date = ?, expiry_date = ?, document_url = ?, verification_status = 'PENDING', rejection_reason = NULL, created_at = ?
        WHERE certification_id = ?
      `, [primarySkill, certificationName, certificateNumber, issuingOrg, issueDate, expiryDate || '', documentUrl, now, certId]);
    } else {
      await runQuery(`
        INSERT INTO certifications (certification_id, worker_id, primary_skill, certification_name, certificate_number, issuing_org, issue_date, expiry_date, document_url, verification_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
      `, [certId, workerId, primarySkill, certificationName, certificateNumber, issuingOrg, issueDate, expiryDate || '', documentUrl, now]);
    }

    if (yearsExperience) {
      await runQuery(`UPDATE workers SET years_experience = ? WHERE worker_id = ?`, [Number(yearsExperience), workerId]);
    }

    await runQuery(`UPDATE workers SET onboarding_status = 'CERTIFICATION_UNDER_REVIEW', updated_at = ? WHERE worker_id = ?`, [now, workerId]);

    await logAudit(userId, 'SKILL_CERTIFICATION_SUBMISSION', 'CERTIFICATION', certId, { certificateNumber, primarySkill }, req.ip || '127.0.0.1');

    res.json({
      success: true,
      message: 'Skill certification submitted for admin review. Status: PENDING.',
      status: 'PENDING',
      certId,
      certification_id: certId,
      next_step: 'CERTIFICATION_WAITING_VERIFICATION'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to submit skill certification.' });
  }
}

export async function handleInsuranceDecision(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const workerId = req.user!.worker_id;
    const userId = req.user!.user_id;
    const { needsInsurance } = req.body;

    const now = new Date().toISOString();

    if (needsInsurance === false || needsInsurance === 'false' || needsInsurance === 'NO') {
      // IF NO:
      // Worker selects [ NO, NOT NOW ]
      // Show: Insurance Not Enrolled. You can explore insurance and welfare options later.
      // [ CONTINUE ONBOARDING ] -> Advances to Cooperative Approval. No insurance contribution.
      await runQuery(`
        UPDATE workers
        SET onboarding_status = 'INSURANCE_SKIPPED', insurance_contribution_enabled = 0, updated_at = ?
        WHERE worker_id = ?
      `, [now, workerId]);

      await logAudit(userId, 'INSURANCE_DECISION_SKIPPED', 'WORKER', workerId, { decision: 'NO_NOT_NOW' }, req.ip || '127.0.0.1');

      res.json({
        success: true,
        message: 'Insurance Not Enrolled. You can explore insurance and welfare options later.',
        enrolled: false,
        next_step: 'COOPERATIVE_APPROVAL'
      });
      return;
    }

    // IF YES: Worker needs insurance -> proceed to existing vs new scheme decision
    res.json({
      success: true,
      message: 'Please indicate whether you already have an existing insurance policy or wish to explore official schemes.',
      enrolled: true,
      next_step: 'INSURANCE_EXISTING_OR_SCHEME'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to process insurance decision.' });
  }
}

export async function submitInsurancePolicyWithConsent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const workerId = req.user!.worker_id;
    const userId = req.user!.user_id;

    const {
      providerOrScheme,
      policyNumber,
      policyHolderName,
      coverage,
      startDate,
      endDate,
      documentUrl,
      isExistingPolicy,
      // Mandatory Terms & Conditions Checkboxes:
      termsAccepted,
      accuracyConfirmed,
      noPlatformIssuanceUnderstood,
      processingConsentGiven
    } = req.body;

    if (!providerOrScheme || !policyNumber || !policyHolderName || !coverage || !startDate || !endDate || !documentUrl) {
      res.status(400).json({ success: false, message: 'All policy information and document proof are mandatory.' });
      return;
    }

    // Strict validation of mandatory consent checkboxes
    if (!termsAccepted || !accuracyConfirmed || !noPlatformIssuanceUnderstood || !processingConsentGiven) {
      res.status(400).json({
        success: false,
        message: 'All mandatory Terms & Conditions and consent checkboxes must be acknowledged before submitting.'
      });
      return;
    }

    const now = new Date().toISOString();
    const existing = await getOne<any>(`SELECT policy_id FROM insurance_policies WHERE worker_id = ?`, [workerId]);
    const policyId = existing ? existing.policy_id : generateId('pol');

    if (existing) {
      await runQuery(`
        UPDATE insurance_policies
        SET provider_or_scheme = ?, policy_number = ?, policy_holder_name = ?, coverage = ?,
            start_date = ?, expiry_date = ?, document_url = ?, verification_status = 'PENDING',
            rejection_reason = NULL, updated_at = ?
        WHERE policy_id = ?
      `, [providerOrScheme, policyNumber, policyHolderName, coverage, startDate, endDate, documentUrl, now, policyId]);
    } else {
      await runQuery(`
        INSERT INTO insurance_policies (policy_id, worker_id, provider_or_scheme, policy_number, policy_holder_name, coverage, start_date, expiry_date, document_url, verification_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
      `, [policyId, workerId, providerOrScheme, policyNumber, policyHolderName, coverage, startDate, endDate, documentUrl, now, now]);
    }

    // Save Consent Record
    const consentId = generateId('cns');
    await runQuery(`
      INSERT INTO consents (consent_id, user_id, entity_type, entity_id, consent_type, consent_version, accepted, accepted_at, ip_address_or_audit_reference, created_at, updated_at)
      VALUES (?, ?, 'INSURANCE_POLICY', ?, 'INSURANCE_TERMS_AND_CONDITIONS', 'v1.0', 1, ?, ?, ?, ?)
    `, [consentId, userId, policyId, now, `${req.ip || '127.0.0.1'} (Consent Verified)`, now, now]);

    await runQuery(`UPDATE workers SET onboarding_status = 'INSURANCE_UNDER_REVIEW', updated_at = ? WHERE worker_id = ?`, [now, workerId]);

    await logAudit(userId, 'INSURANCE_SUBMITTED_WITH_CONSENT', 'INSURANCE_POLICY', policyId, {
      policyNumber,
      providerOrScheme,
      isExistingPolicy: !!isExistingPolicy,
      consentId
    }, req.ip || '127.0.0.1');

    res.json({
      success: true,
      message: 'Insurance submitted for cooperative verification ✓ Status: PENDING.',
      status: 'PENDING',
      policy_id: policyId,
      next_step: 'INSURANCE_WAITING_VERIFICATION'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to submit insurance details.' });
  }
}

export async function handleContributionChoice(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const workerId = req.user!.worker_id;
    const userId = req.user!.user_id;
    const { enableContribution } = req.body;

    // Must verify that insurance is already verified
    const policy = await getOne<any>(`
      SELECT verification_status FROM insurance_policies WHERE worker_id = ?
    `, [workerId]);

    if (!policy || policy.verification_status !== 'VERIFIED') {
      res.status(400).json({
        success: false,
        message: 'Contribution choice is only available after insurance has been officially verified.'
      });
      return;
    }

    const enabled = enableContribution === true || enableContribution === 1 || enableContribution === 'true' || enableContribution === 'YES';
    const now = new Date().toISOString();

    await runQuery(`
      UPDATE workers
      SET insurance_contribution_enabled = ?, onboarding_status = 'COOPERATIVE_PENDING', updated_at = ?
      WHERE worker_id = ?
    `, [enabled ? 1 : 0, now, workerId]);

    await logAudit(userId, 'INSURANCE_CONTRIBUTION_DECISION', 'WORKER', workerId, {
      enabled,
      defaultRate: '10%'
    }, req.ip || '127.0.0.1');

    res.json({
      success: true,
      message: enabled
        ? '10% insurance contribution enabled from eligible job earnings ✓'
        : 'Insurance contribution disabled (₹0). Eligible earnings will be 100%.',
      enabled,
      next_step: 'COOPERATIVE_APPROVAL'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to save contribution preference.' });
  }
}

export async function toggleWorkerAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const workerId = req.user!.worker_id;
    const { isAvailable, locationSharingEnabled } = req.body;

    const worker = await getOne<any>(`SELECT onboarding_status FROM workers WHERE worker_id = ?`, [workerId]);
    if (!worker || worker.onboarding_status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        message: 'Only fully verified and activated workers can toggle availability.'
      });
      return;
    }

    const now = new Date().toISOString();
    const availableVal = isAvailable ? 1 : 0;
    const locShareVal = locationSharingEnabled !== undefined ? (locationSharingEnabled ? 1 : 0) : availableVal;

    await runQuery(`
      UPDATE worker_availability
      SET is_available = ?, location_sharing_enabled = ?, last_status_change = ?
      WHERE worker_id = ?
    `, [availableVal, locShareVal, now, workerId]);

    // Update location state
    await runQuery(`
      UPDATE worker_locations
      SET location_state = ?, updated_at = ?
      WHERE worker_id = ?
    `, [availableVal ? 'AVAILABLE' : 'OFFLINE', now, workerId]);

    res.json({
      success: true,
      message: availableVal ? 'Status updated to 🟢 AVAILABLE' : 'Status updated to OFFLINE',
      is_available: !!availableVal,
      isAvailable: !!availableVal,
      location_sharing_enabled: !!locShareVal,
      locationSharingEnabled: !!locShareVal
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update availability.' });
  }
}

export async function getWorkerDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const workerId = req.user!.worker_id;
    if (!workerId) {
      res.status(400).json({ success: false, message: 'Worker ID required.' });
      return;
    }

    const worker = await getOne<any>(`
      SELECT w.*, u.name, u.email, u.phone, u.language,
             sk.name as skill_name,
             va.is_available, va.location_sharing_enabled,
             wl.latitude, wl.longitude, wl.location_state
      FROM workers w
      JOIN users u ON w.user_id = u.user_id
      LEFT JOIN skills sk ON w.primary_skill_id = sk.skill_id
      LEFT JOIN worker_availability va ON w.worker_id = va.worker_id
      LEFT JOIN worker_locations wl ON w.worker_id = wl.worker_id
      WHERE w.worker_id = ?
    `, [workerId]);

    const jobs = await getAll<any>(`
      SELECT b.*, u.name as customer_name, u.phone as customer_phone,
             sk.name as skill_name,
             inv.invoice_number, inv.status as invoice_status, inv.net_earnings, inv.insurance_contribution
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.customer_id
      LEFT JOIN users u ON c.user_id = u.user_id
      LEFT JOIN skills sk ON (SELECT skill_id FROM services WHERE service_id = b.service_id) = sk.skill_id
      LEFT JOIN invoices inv ON b.booking_id = inv.booking_id
      WHERE b.worker_id = ? OR b.worker_id IS NULL
      ORDER BY b.created_at DESC
    `, [workerId]);

    const activeBooking = jobs.find(b =>
      ['REQUESTED', 'ACCEPTED', 'WORKER_TRAVELLING', 'ARRIVED', 'SERVICE_IN_PROGRESS'].includes(b.status)
    ) || null;

    res.json({
      success: true,
      worker,
      jobs,
      activeBooking,
      bookings: jobs
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch worker dashboard data.' });
  }
}

