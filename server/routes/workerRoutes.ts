import { Router } from 'express';
import {
  getOnboardingStatus,
  submitBasicProfile,
  submitEshram,
  submitSkillCertification,
  handleInsuranceDecision,
  submitInsurancePolicyWithConsent,
  handleContributionChoice,
  toggleWorkerAvailability,
  getWorkerDashboard
} from '../controllers/workerOnboardingController';
import { authenticateToken, requireWorker } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(requireWorker);

router.get('/dashboard', getWorkerDashboard);
router.get('/onboarding-status', getOnboardingStatus);
router.post('/basic-profile', submitBasicProfile);
router.post('/eshram', submitEshram);
router.post('/certification', submitSkillCertification);
router.post('/insurance-decision', handleInsuranceDecision);
router.post('/insurance-submit', submitInsurancePolicyWithConsent);
router.post('/contribution-choice', handleContributionChoice);
router.post('/availability', toggleWorkerAvailability);

export default router;
