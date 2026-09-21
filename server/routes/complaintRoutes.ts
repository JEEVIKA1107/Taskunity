import { Router } from 'express';
import { submitComplaint, getMyComplaints } from '../controllers/complaintsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', submitComplaint);
router.get('/', getMyComplaints);

export default router;
