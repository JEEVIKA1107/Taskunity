import { Router } from 'express';
import {
  sendRegistrationOtp,
  verifyRegistrationOtp,
  registerCustomer,
  registerWorker,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/send-otp', sendRegistrationOtp);
router.post('/verify-otp', verifyRegistrationOtp);
router.post('/register/customer', registerCustomer);
router.post('/register/worker', registerWorker);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authenticateToken, changePassword);
router.get('/me', authenticateToken, getMe);

export default router;
