import { Router } from 'express';
import {
  getServices,
  findMatchingWorkers,
  createBooking,
  updateBookingStatus,
  processPayment,
  submitRating,
  getLiveTracking,
  getMyBookings
} from '../controllers/bookingController';
import { authenticateToken, requireCustomer, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getMyBookings);
router.get('/services', getServices);
router.get('/match-workers', findMatchingWorkers);
router.get('/my-bookings', getMyBookings);
router.get('/live-tracking/:bookingId', getLiveTracking);

router.post('/', requireCustomer, createBooking);
router.post('/create', requireCustomer, createBooking);

router.patch('/:id/status', requireRole(['WORKER', 'ADMIN']), updateBookingStatus);

router.post('/:id/pay', requireCustomer, processPayment);
router.post('/pay', requireCustomer, processPayment);

router.post('/:id/rate', submitRating);
router.post('/rate', submitRating);

export default router;
