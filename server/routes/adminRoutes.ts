import { Router } from 'express';
import {
  getAdminOverview,
  getWorkersList,
  verifyEshram,
  verifyCertification,
  verifyInsurance,
  cooperativeApproval,
  getInsuranceManagement,
  updateContributionRate,
  getLiveWorkerMap,
  getAiDemandForecasting,
  getAiWorkforceAllocation,
  getAuditLogs,
  updateClaimStatus
} from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Strict RBAC: All admin routes strictly require valid ADMIN role
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/overview', getAdminOverview);
router.get('/workers', getWorkersList);
router.get('/insurance-management', getInsuranceManagement);
router.get('/insurance', getInsuranceManagement);
router.get('/live-map', getLiveWorkerMap);
router.get('/map', getLiveWorkerMap);
router.get('/ai-forecast', getAiDemandForecasting);
router.get('/ai/demand-forecasting', getAiDemandForecasting);
router.get('/ai-allocation', getAiWorkforceAllocation);
router.get('/ai/workforce-allocation', getAiWorkforceAllocation);
router.get('/audit-logs', getAuditLogs);

// Verifications
router.post('/eshram/:eshramId/verify', verifyEshram);
router.post('/verify/eshram/:eshramId', verifyEshram);

router.post('/certifications/:certId/verify', verifyCertification);
router.post('/verify/certification/:certId', verifyCertification);

router.post('/insurance/:policyId/verify', verifyInsurance);
router.post('/verify/insurance/:policyId', verifyInsurance);

router.post('/cooperative/:workerId/approval', cooperativeApproval);
router.post('/verify/cooperative-approval/:workerId', cooperativeApproval);

router.post('/contribution-rate', updateContributionRate);
router.post('/insurance/contribution-rate', updateContributionRate);
router.patch('/claims/:claimId/status', updateClaimStatus);

export default router;
