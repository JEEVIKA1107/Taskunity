import { Router } from 'express';
import { submitFeedback, getMyFeedback } from '../controllers/feedbackController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', submitFeedback);
router.get('/', getMyFeedback);

export default router;
