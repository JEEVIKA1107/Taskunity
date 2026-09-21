import { Router } from 'express';
import {
  getOfficialSchemes,
  getWorkerPolicyDetails,
  getContributionHistory,
  submitInsuranceClaim,
  getWorkerClaims
} from '../controllers/insuranceController';
import { authenticateToken, requireWorker } from '../middleware/auth';

const router = Router();

// Schemes can be viewed by all authenticated users
router.get('/schemes', authenticateToken, getOfficialSchemes);

// Worker specific insurance routes
router.get('/my-policy', authenticateToken, requireWorker, getWorkerPolicyDetails);
router.get('/contributions', authenticateToken, requireWorker, getContributionHistory);
router.post('/claims', authenticateToken, requireWorker, submitInsuranceClaim);
router.get('/my-claims', authenticateToken, requireWorker, getWorkerClaims);

export default router;
