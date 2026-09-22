import { Response } from 'express';
import { generateId } from '../utils/idGenerator';
import { getOne, getAll, runQuery } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export async function getServices(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const services = await getAll<any>(`
      SELECT s.*, sk.name as skill_name, sk.category as skill_category
      FROM services s
      JOIN skills sk ON s.skill_id = sk.skill_id
      ORDER BY s.name ASC
    `);

    const skills = await getAll<any>(`SELECT * FROM skills WHERE active = 1`);

    res.json({ success: true, services, skills });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch services.' });
  }
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export async function findMatchingWorkers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { skillId, serviceId, lat, lng } = req.query;

    let targetSkillId = skillId as string;
    if (!targetSkillId && serviceId) {
      const srv = await getOne<any>(`SELECT skill_id FROM services WHERE service_id = ?`, [serviceId]);
      if (srv) targetSkillId = srv.skill_id;
    }

    // Matching Engine:
    // Matches verified workers with onboarding_status = 'ACTIVE', matching primary or secondary skills
    const workers = await getAll<any>(`
      SELECT w.worker_id, w.user_id, w.district, w.years_experience, w.preferred_working_area, w.rating,
             w.jobs_completed, w.insurance_contribution_enabled,
             u.name, u.phone, u.email,
             sk.name as skill_name,
             va.is_available, va.location_sharing_enabled,
             wl.latitude, wl.longitude, wl.location_state,
             es.verification_status as eshram_status,
             ct.verification_status as cert_status,
             ip.verification_status as insurance_status
      FROM workers w
      JOIN users u ON w.user_id = u.user_id
      LEFT JOIN skills sk ON w.primary_skill_id = sk.skill_id
      LEFT JOIN worker_availability va ON w.worker_id = va.worker_id
      LEFT JOIN worker_locations wl ON w.worker_id = wl.worker_id
      LEFT JOIN eshram_records es ON w.worker_id = es.worker_id
      LEFT JOIN certifications ct ON w.worker_id = ct.worker_id
      LEFT JOIN insurance_policies ip ON w.worker_id = ip.worker_id
      WHERE w.onboarding_status = 'ACTIVE'
        AND (
          ? IS NULL OR ? = '' OR w.primary_skill_id = ?
          OR EXISTS (SELECT 1 FROM worker_skills ws WHERE ws.worker_id = w.worker_id AND ws.skill_id = ?)
        )
      ORDER BY va.is_available DESC, w.rating DESC, w.years_experience DESC
    `, [targetSkillId || '', targetSkillId || '', targetSkillId || '', targetSkillId || '']);

    const custLat = Number(lat);
    const custLng = Number(lng);
    const hasCustGeo = !isNaN(custLat) && !isNaN(custLng) && custLat !== 0 && custLng !== 0;

    for (const wrk of workers) {
      if (hasCustGeo && wrk.latitude && wrk.longitude) {
        wrk.distance_km = haversineDistanceKm(custLat, custLng, Number(wrk.latitude), Number(wrk.longitude));
      } else {
        wrk.distance_km = 2.5;
      }
    }

    // Sort: Online workers first, then closest distance, then rating
    workers.sort((a, b) => {
      const availA = a.is_available ? 1 : 0;
      const availB = b.is_available ? 1 : 0;
      if (availB !== availA) return availB - availA;
      if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
      return (b.rating || 5) - (a.rating || 5);
    });

    res.json({
      success: true,
      workers,
      count: workers.length,
      message: workers.length > 0
        ? `${workers.length} verified worker(s) matched in your area.`
        : 'No verified workers are currently available nearby for this service.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Matching engine query failed.' });
  }
}

export async function createBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const customerId = req.user!.customer_id;
    if (!customerId) {
      res.status(400).json({ success: false, message: 'Customer profile required to make a booking.' });
      return;
    }

    const serviceId = req.body.serviceId || req.body.service_id;
    const workerId = req.body.workerId || req.body.worker_id;
    const problemTitle = req.body.problemTitle || req.body.problem_title;
    const description = req.body.description;
    const photos = req.body.photos;
    const customerAddress = req.body.customerAddress || req.body.customer_address;
    const customerLat = req.body.customerLat || req.body.customer_lat;
    const customerLng = req.body.customerLng || req.body.customer_lng;
    const scheduledTime = req.body.scheduledTime || req.body.scheduled_time;

    if (!serviceId || !problemTitle || !customerAddress) {
      res.status(400).json({ success: false, message: 'Service, problem title, and address are mandatory.' });
      return;
    }

    const service = await getOne<any>(`SELECT base_price FROM services WHERE service_id = ?`, [serviceId]);
    const totalAmount = service ? service.base_price : 1000;

    const bookingId = `B-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    await runQuery(`
      INSERT INTO bookings (booking_id, customer_id, worker_id, service_id, problem_title, description, photos, customer_address, customer_lat, customer_lng, scheduled_time, status, total_amount, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'REQUESTED', ?, ?, ?)
    `, [bookingId, customerId, workerId || null, serviceId, problemTitle, description || '', JSON.stringify(photos || []), customerAddress, Number(customerLat) || 11.0168, Number(customerLng) || 76.9558, scheduledTime || now, totalAmount, now, now]);

    // Send notification to worker
    if (workerId) {
      const workerUser = await getOne<any>(`SELECT user_id FROM workers WHERE worker_id = ?`, [workerId]);
      if (workerUser) {
        await runQuery(`
          INSERT INTO notifications (notification_id, user_id, title, message, type, is_read, link, created_at)
          VALUES (?, ?, 'New Job Request', ?, 'BOOKING', 0, ?, ?)
        `, [generateId('notif'), workerUser.user_id, `New request: ${problemTitle} (${bookingId})`, `/worker/jobs/${bookingId}`, now]);
      }
    }

    await logAudit(req.user!.user_id, 'BOOKING_CREATED', 'BOOKING', bookingId, { workerId, totalAmount }, req.ip || '127.0.0.1');

    res.status(201).json({
      success: true,
      message: 'Booking request placed successfully. Waiting for worker confirmation.',
      booking_id: bookingId,
      status: 'REQUESTED',
      booking: {
        booking_id: bookingId,
        id: bookingId,
        service_id: serviceId,
        problem_title: problemTitle,
        customer_address: customerAddress,
        total_amount: totalAmount,
        status: 'REQUESTED'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create booking.' });
  }
}

export async function updateBookingStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, lat, lng } = req.body;

    const validStatuses = [
      'REQUESTED',
      'ACCEPTED',
      'WORKER_TRAVELLING',
      'ARRIVED',
      'SERVICE_IN_PROGRESS',
      'COMPLETED',
      'CANCELLED'
    ];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid booking status.' });
      return;
    }

    const booking = await getOne<any>(`SELECT * FROM bookings WHERE booking_id = ?`, [id]);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found.' });
      return;
    }

    const now = new Date().toISOString();
    await runQuery(`UPDATE bookings SET status = ?, updated_at = ? WHERE booking_id = ?`, [status, now, id]);

    // Update worker location state if worker is acting
    if (booking.worker_id) {
      let locationState = 'AVAILABLE';
      if (status === 'WORKER_TRAVELLING') locationState = 'TRAVELLING_TO_CUSTOMER';
      else if (status === 'ARRIVED') locationState = 'ARRIVED';
      else if (status === 'SERVICE_IN_PROGRESS') locationState = 'SERVICE_IN_PROGRESS';
      else if (status === 'COMPLETED' || status === 'CANCELLED') locationState = 'AVAILABLE';

      const latitude = Number(lat) || (status === 'ARRIVED' ? booking.customer_lat : 11.0180);
      const longitude = Number(lng) || (status === 'ARRIVED' ? booking.customer_lng : 76.9570);

      await runQuery(`
        UPDATE worker_locations
        SET location_state = ?, latitude = ?, longitude = ?, booking_id = ?, updated_at = ?
        WHERE worker_id = ?
      `, [locationState, latitude, longitude, status === 'COMPLETED' || status === 'CANCELLED' ? null : id, now, booking.worker_id]);
    }

    // If status is COMPLETED, automatically generate digital invoice
    if (status === 'COMPLETED') {
      const existingInvoice = await getOne<any>(`SELECT invoice_id FROM invoices WHERE booking_id = ?`, [id]);
      if (!existingInvoice) {
        const worker = await getOne<any>(`SELECT insurance_contribution_enabled FROM workers WHERE worker_id = ?`, [booking.worker_id]);
        const settingRate = await getOne<any>(`SELECT setting_value FROM cooperative_settings WHERE setting_key = 'insurance_contribution_rate'`);
        const ratePercent = Number(settingRate ? settingRate.setting_value : 10);

        const isContribEnabled = worker && worker.insurance_contribution_enabled === 1;
        const contribAmount = isContribEnabled ? (booking.total_amount * ratePercent) / 100 : 0;
        const netEarnings = booking.total_amount - contribAmount;

        const invoiceId = generateId('inv');
        const invoiceNumber = `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`;

        await runQuery(`
          INSERT INTO invoices (invoice_id, invoice_number, booking_id, customer_id, worker_id, service_amount, insurance_contribution, net_earnings, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?)
        `, [invoiceId, invoiceNumber, id, booking.customer_id, booking.worker_id, booking.total_amount, contribAmount, netEarnings, now]);
      }
    }

    await logAudit(req.user!.user_id, 'BOOKING_STATUS_CHANGED', 'BOOKING', id, { from: booking.status, to: status }, req.ip || '127.0.0.1');

    const updatedBooking = await getOne<any>(`SELECT * FROM bookings WHERE booking_id = ?`, [id]);

    res.json({
      success: true,
      message: `Booking status updated to ${status}.`,
      status,
      booking: updatedBooking || { ...booking, status, updated_at: now }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update booking status.' });
  }
}

export async function processPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const bookingId = req.params.id || req.params.bookingId || req.body.bookingId || req.body.booking_id;
    const paymentMethod = req.body.payment_method || req.body.paymentMethod || 'UPI / Cooperative Gateway';
    const booking = await getOne<any>(`SELECT * FROM bookings WHERE booking_id = ?`, [bookingId]);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found.' });
      return;
    }

    const worker = await getOne<any>(`SELECT * FROM workers WHERE worker_id = ?`, [booking.worker_id]);
    const settingRate = await getOne<any>(`SELECT setting_value FROM cooperative_settings WHERE setting_key = 'insurance_contribution_rate'`);
    const ratePercent = Number(settingRate ? settingRate.setting_value : 10);

    // Check if worker insurance contribution is enabled
    const isContribEnabled = worker && (worker.insurance_contribution_enabled === 1 || worker.insurance_contribution_enabled === true);

    const paymentAmount = booking.total_amount;
    const contributionAmount = isContribEnabled ? (paymentAmount * ratePercent) / 100 : 0;
    const eligibleEarnings = paymentAmount - contributionAmount;

    const paymentId = generateId('pay');
    const txnRef = `TXN-PAY-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    // 1. Insert Payment
    await runQuery(`
      INSERT INTO payments (payment_id, booking_id, customer_id, worker_id, amount, payment_method, payment_status, transaction_reference, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?)
    `, [paymentId, bookingId, booking.customer_id, booking.worker_id, paymentAmount, paymentMethod, txnRef, now]);

    // 2. If contribution enabled, record in insurance_contributions and insurance_fund_ledger
    if (isContribEnabled && contributionAmount > 0) {
      const contribId = generateId('cnt');
      const contribRef = `TXN-CONT-${Math.floor(100000 + Math.random() * 900000)}`;

      await runQuery(`
        INSERT INTO insurance_contributions (contribution_id, worker_id, booking_id, payment_id, payment_amount, contribution_rate, contribution_amount, status, transaction_reference, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'RECORDED', ?, ?)
      `, [contribId, booking.worker_id, bookingId, paymentId, paymentAmount, ratePercent, contributionAmount, contribRef, now]);

      // Calculate current ledger balance
      const lastLedger = await getOne<any>(`SELECT balance_after FROM insurance_fund_ledger ORDER BY created_at DESC LIMIT 1`);
      const currentBalance = (lastLedger ? Number(lastLedger.balance_after) : 0) + contributionAmount;

      await runQuery(`
        INSERT INTO insurance_fund_ledger (ledger_id, contribution_id, worker_id, booking_id, credit_amount, debit_amount, balance_after, transaction_type, reference, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, 'JOB_EARNING_CONTRIBUTION', ?, ?)
      `, [generateId('ledg'), contribId, booking.worker_id, bookingId, contributionAmount, currentBalance, contribRef, now]);
    }

    // 3. Update or Insert Digital Invoice
    const invoiceNumber = `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    let finalInvoice: any;
    const existingInvoice = await getOne<any>(`SELECT * FROM invoices WHERE booking_id = ?`, [bookingId]);
    if (existingInvoice) {
      await runQuery(`
        UPDATE invoices
        SET service_amount = ?, insurance_contribution = ?, net_earnings = ?, status = 'PAID'
        WHERE booking_id = ?
      `, [paymentAmount, contributionAmount, eligibleEarnings, bookingId]);
      finalInvoice = {
        ...existingInvoice,
        service_amount: paymentAmount,
        insurance_contribution: contributionAmount,
        net_earnings: eligibleEarnings,
        status: 'PAID'
      };
    } else {
      const invId = generateId('inv');
      await runQuery(`
        INSERT INTO invoices (invoice_id, invoice_number, booking_id, customer_id, worker_id, service_amount, insurance_contribution, net_earnings, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?)
      `, [invId, invoiceNumber, bookingId, booking.customer_id, booking.worker_id, paymentAmount, contributionAmount, eligibleEarnings, now]);
      finalInvoice = {
        invoice_id: invId,
        invoice_number: invoiceNumber,
        booking_id: bookingId,
        customer_id: booking.customer_id,
        worker_id: booking.worker_id,
        service_amount: paymentAmount,
        insurance_contribution: contributionAmount,
        net_earnings: eligibleEarnings,
        status: 'PAID',
        created_at: now
      };
    }

    // 4. Update worker completed jobs count
    await runQuery(`UPDATE workers SET jobs_completed = jobs_completed + 1 WHERE worker_id = ?`, [booking.worker_id]);

    await logAudit(req.user!.user_id, 'PAYMENT_PROCESSED', 'PAYMENT', paymentId, {
      bookingId,
      paymentAmount,
      contributionAmount,
      eligibleEarnings
    }, req.ip || '127.0.0.1');

    res.json({
      success: true,
      message: 'Payment confirmed successfully.',
      payment: {
        payment_id: paymentId,
        service_amount: paymentAmount,
        insurance_contribution: contributionAmount,
        eligible_earnings: eligibleEarnings,
        transaction_reference: txnRef,
        status: 'PAID'
      },
      invoice: finalInvoice
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Payment processing failed.' });
  }
}

export async function submitRating(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const bookingId = req.params.id || req.params.bookingId || req.body.bookingId || req.body.booking_id;
    const ratingValue = Number(req.body.rating ?? req.body.ratingValue ?? req.body.rating_value);
    const timelinessRating = Number(req.body.timeliness_rating ?? req.body.timelinessRating ?? 5);
    const comment = req.body.review ?? req.body.comment ?? '';
    const fromUserId = req.user!.user_id;

    if (!bookingId || !ratingValue || ratingValue < 1 || ratingValue > 5) {
      res.status(400).json({ success: false, message: 'Valid rating score between 1 and 5 is required.' });
      return;
    }

    const booking = await getOne<any>(`SELECT * FROM bookings WHERE booking_id = ?`, [bookingId]);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found.' });
      return;
    }

    let toUserId = req.body.toUserId || req.body.to_user_id;
    if (!toUserId) {
      if (req.user!.role === 'CUSTOMER' && booking.worker_id) {
        const workerUser = await getOne<any>(`SELECT user_id FROM workers WHERE worker_id = ?`, [booking.worker_id]);
        toUserId = workerUser?.user_id;
      } else if (req.user!.role === 'WORKER' && booking.customer_id) {
        const custUser = await getOne<any>(`SELECT user_id FROM customers WHERE customer_id = ?`, [booking.customer_id]);
        toUserId = custUser?.user_id;
      }
    }
    if (!toUserId) {
      toUserId = fromUserId;
    }

    const ratingId = generateId('rtg');
    const now = new Date().toISOString();

    await runQuery(`
      INSERT INTO ratings (rating_id, booking_id, from_user_id, to_user_id, rating_value, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [ratingId, bookingId, fromUserId, toUserId, ratingValue, `${comment}${timelinessRating ? ` [Timeliness & Conduct: ${timelinessRating}/5]` : ''}`, now]);

    // Recalculate average rating if toUser is a worker
    const worker = await getOne<any>(`SELECT worker_id FROM workers WHERE user_id = ?`, [toUserId]);
    if (worker) {
      const avgRow = await getOne<any>(`SELECT AVG(rating_value) as avg_rating FROM ratings WHERE to_user_id = ?`, [toUserId]);
      if (avgRow && avgRow.avg_rating) {
        await runQuery(`UPDATE workers SET rating = ? WHERE worker_id = ?`, [Number(Number(avgRow.avg_rating).toFixed(1)), worker.worker_id]);
      }
    }

    res.json({
      success: true,
      message: 'Thank you! Rating submitted successfully.',
      rating: {
        rating_id: ratingId,
        rating_value: ratingValue,
        timeliness_rating: timelinessRating,
        comment
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to submit rating.' });
  }
}

export async function getLiveTracking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { bookingId } = req.params;
    const booking = await getOne<any>(`
      SELECT b.*, u.name as worker_name, u.phone as worker_phone, w.rating as worker_rating,
             sk.name as skill_name, wl.latitude, wl.longitude, wl.location_state, wl.heading, wl.speed
      FROM bookings b
      LEFT JOIN workers w ON b.worker_id = w.worker_id
      LEFT JOIN users u ON w.user_id = u.user_id
      LEFT JOIN skills sk ON w.primary_skill_id = sk.skill_id
      LEFT JOIN worker_locations wl ON w.worker_id = wl.worker_id
      WHERE b.booking_id = ?
    `, [bookingId]);

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found.' });
      return;
    }

    // Live location privacy rule: Customer only sees live location during active assigned booking
    const isLive = ['WORKER_TRAVELLING', 'ARRIVED', 'SERVICE_IN_PROGRESS'].includes(booking.status);

    res.json({
      success: true,
      booking,
      live_location: isLive ? {
        latitude: booking.latitude,
        longitude: booking.longitude,
        heading: booking.heading,
        speed: booking.speed,
        state: booking.location_state,
        eta_minutes: booking.status === 'ARRIVED' ? 0 : 12
      } : null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve live tracking.' });
  }
}

export async function getMyBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let bookings: any[] = [];
    if (req.user!.role === 'CUSTOMER') {
      bookings = await getAll<any>(`
        SELECT b.*, u.name as worker_name, u.phone as worker_phone, sk.name as skill_name,
               inv.invoice_number, inv.status as invoice_status
        FROM bookings b
        LEFT JOIN workers w ON b.worker_id = w.worker_id
        LEFT JOIN users u ON w.user_id = u.user_id
        LEFT JOIN skills sk ON w.primary_skill_id = sk.skill_id
        LEFT JOIN invoices inv ON b.booking_id = inv.booking_id
        WHERE b.customer_id = ?
        ORDER BY b.created_at DESC
      `, [req.user!.customer_id]);
    } else if (req.user!.role === 'WORKER') {
      bookings = await getAll<any>(`
        SELECT b.*, u.name as customer_name, u.phone as customer_phone, sk.name as skill_name,
               inv.invoice_number, inv.status as invoice_status, inv.net_earnings, inv.insurance_contribution
        FROM bookings b
        JOIN customers c ON b.customer_id = c.customer_id
        JOIN users u ON c.user_id = u.user_id
        LEFT JOIN skills sk ON (SELECT skill_id FROM services WHERE service_id = b.service_id) = sk.skill_id
        LEFT JOIN invoices inv ON b.booking_id = inv.booking_id
        WHERE b.worker_id = ?
        ORDER BY b.created_at DESC
      `, [req.user!.worker_id]);
    }

    res.json({ success: true, bookings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
  }
}
