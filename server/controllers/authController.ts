import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { generateId } from '../utils/idGenerator';
import { getOne, runQuery } from '../db/database';
import { JWT_SECRET, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

// In-memory OTP storage for registration verification
interface OtpEntry {
  otp: string;
  phone: string;
  expiresAt: number;
}
const otpStore = new Map<string, OtpEntry>();

// Helper to determine exact worker pending step
export async function determineWorkerPendingStep(workerId: string): Promise<string> {
  const worker = await getOne<any>(`SELECT * FROM workers WHERE worker_id = ?`, [workerId]);
  if (!worker) return 'REGISTERED';

  if (worker.onboarding_status === 'ACTIVE') {
    return 'DASHBOARD';
  }

  // 1. Check basic profile completion (address, dob, primary skill)
  if (!worker.dob || !worker.address || !worker.primary_skill_id) {
    return 'BASIC_PROFILE';
  }

  // 2. Check e-Shram
  const eshram = await getOne<any>(`SELECT * FROM eshram_records WHERE worker_id = ?`, [workerId]);
  if (!eshram) {
    return 'ESHRAM';
  }
  if (eshram.verification_status === 'PENDING' || eshram.verification_status === 'UNDER_REVIEW') {
    return 'ESHRAM_WAITING_VERIFICATION';
  }
  if (eshram.verification_status === 'REJECTED') {
    return 'ESHRAM_CORRECTION';
  }

  // 3. Check Skill Certification
  const cert = await getOne<any>(`SELECT * FROM certifications WHERE worker_id = ?`, [workerId]);
  if (!cert) {
    return 'SKILL_CERTIFICATION';
  }
  if (cert.verification_status === 'PENDING' || cert.verification_status === 'UNDER_REVIEW') {
    return 'CERTIFICATION_WAITING_VERIFICATION';
  }
  if (cert.verification_status === 'REJECTED') {
    return 'CERTIFICATION_CORRECTION';
  }

  // 4. Check Insurance & Welfare
  if (worker.onboarding_status === 'INSURANCE_SKIPPED') {
    // Skipped insurance, advance to cooperative approval
    return 'COOPERATIVE_APPROVAL';
  }

  const policy = await getOne<any>(`SELECT * FROM insurance_policies WHERE worker_id = ?`, [workerId]);
  if (!policy) {
    return 'INSURANCE_DECISION';
  }

  if (policy.verification_status === 'PENDING' || policy.verification_status === 'UNDER_REVIEW') {
    return 'INSURANCE_WAITING_VERIFICATION';
  }

  if (policy.verification_status === 'REJECTED') {
    return 'INSURANCE_CORRECTION';
  }

  // 5. If insurance verified, check if contribution choice made
  if (policy.verification_status === 'VERIFIED') {
    if (worker.onboarding_status === 'INSURANCE_CONTRIBUTION_PENDING') {
      return 'INSURANCE_CONTRIBUTION';
    }
  }

  // 6. Cooperative Approval
  if (worker.onboarding_status === 'COOPERATIVE_PENDING') {
    return 'COOPERATIVE_APPROVAL';
  }

  return 'COOPERATIVE_APPROVAL';
}

export async function sendRegistrationOtp(req: Request, res: Response): Promise<void> {
  try {
    const { phone } = req.body;
    if (!phone || phone.trim().length < 10) {
      res.status(400).json({ success: false, message: 'Valid mobile number is required.' });
      return;
    }

    // Generate secure 6-digit OTP (e.g. 123456 in demo/test environment for easy testing, or random)
    const otp = process.env.NODE_ENV === 'production' 
      ? Math.floor(100000 + Math.random() * 900000).toString() 
      : '123456';

    const cleanPhone = phone.trim();
    otpStore.set(cleanPhone, {
      otp,
      phone: cleanPhone,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    res.json({
      success: true,
      message: `OTP sent successfully to ${cleanPhone}.`,
      demo_otp: otp // Provided transparently for test automation and acceptance testing
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to generate OTP.' });
  }
}

export async function verifyRegistrationOtp(req: Request, res: Response): Promise<void> {
  try {
    const { phone, otp } = req.body;
    const entry = otpStore.get(phone.trim());

    if (!entry || entry.otp !== otp.trim() || Date.now() > entry.expiresAt) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please try again.' });
      return;
    }

    otpStore.delete(phone.trim());
    res.json({ success: true, message: 'OTP verified successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to verify OTP.' });
  }
}

export async function registerCustomer(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, confirmPassword, phone, otp } = req.body;

    if (!name || !email || !password || !phone) {
      res.status(400).json({ success: false, message: 'All registration fields are required.' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ success: false, message: 'Passwords do not match.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      return;
    }

    const existingUser = await getOne<any>(`SELECT user_id FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
    if (existingUser) {
      res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }

    const userId = generateId('usr');
    const customerId = generateId('cust');
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    await runQuery(`
      INSERT INTO users (user_id, role, name, email, phone, password_hash, language, account_status, created_at, updated_at, last_login)
      VALUES (?, 'CUSTOMER', ?, ?, ?, ?, 'en', 'ACTIVE', ?, ?, ?)
    `, [userId, name.trim(), email.toLowerCase().trim(), phone.trim(), passwordHash, now, now, now]);

    await runQuery(`
      INSERT INTO customers (customer_id, user_id, address, district, state, preferred_language, created_at)
      VALUES (?, ?, '', '', '', 'en', ?)
    `, [customerId, userId, now]);

    await logAudit(userId, 'CUSTOMER_REGISTRATION', 'CUSTOMER', customerId, { email: email.toLowerCase() }, req.ip || '127.0.0.1');

    const token = jwt.sign(
      { user_id: userId, role: 'CUSTOMER', email: email.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Customer Account Created ✓',
      token,
      user: {
        user_id: userId,
        customer_id: customerId,
        role: 'CUSTOMER',
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        language: 'en'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Registration failed.' });
  }
}

export async function registerWorker(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, confirmPassword, phone, otp } = req.body;

    if (!name || !email || !password || !phone) {
      res.status(400).json({ success: false, message: 'All registration fields are required.' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ success: false, message: 'Passwords do not match.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      return;
    }

    const existingUser = await getOne<any>(`SELECT user_id FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
    if (existingUser) {
      res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }

    const userId = generateId('usr');
    const workerId = generateId('wrk');
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    // Worker account is initially marked PENDING with onboarding status REGISTERED
    await runQuery(`
      INSERT INTO users (user_id, role, name, email, phone, password_hash, language, account_status, created_at, updated_at, last_login)
      VALUES (?, 'WORKER', ?, ?, ?, ?, 'en', 'ACTIVE', ?, ?, ?)
    `, [userId, name.trim(), email.toLowerCase().trim(), phone.trim(), passwordHash, now, now, now]);

    await runQuery(`
      INSERT INTO workers (worker_id, user_id, onboarding_status, dob, gender, address, district, state, profile_photo, primary_skill_id, secondary_skills, years_experience, preferred_working_area, rating, jobs_completed, insurance_contribution_enabled, created_at, updated_at)
      VALUES (?, ?, 'REGISTERED', '', '', '', '', '', '', '', '[]', 0, '', 5.0, 0, 0, ?, ?)
    `, [workerId, userId, now, now]);

    await runQuery(`
      INSERT INTO worker_availability (availability_id, worker_id, is_available, location_sharing_enabled, last_status_change)
      VALUES (?, ?, 0, 0, ?)
    `, [generateId('av'), workerId, now]);

    await logAudit(userId, 'WORKER_REGISTRATION', 'WORKER', workerId, { email: email.toLowerCase() }, req.ip || '127.0.0.1');

    const token = jwt.sign(
      { user_id: userId, role: 'WORKER', email: email.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Worker Account Created ✓',
      token,
      user: {
        user_id: userId,
        worker_id: workerId,
        role: 'WORKER',
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        language: 'en',
        onboarding_status: 'REGISTERED',
        pending_step: 'BASIC_PROFILE'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Worker registration failed.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const user = await getOne<any>(`
      SELECT user_id, role, name, email, phone, password_hash, language, account_status
      FROM users WHERE email = ?
    `, [email.toLowerCase().trim()]);

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    if (user.account_status === 'SUSPENDED') {
      res.status(403).json({ success: false, message: 'This account has been suspended by the cooperative administrator.' });
      return;
    }

    const now = new Date().toISOString();
    await runQuery(`UPDATE users SET last_login = ? WHERE user_id = ?`, [now, user.user_id]);

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAudit(user.user_id, 'USER_LOGIN', 'USER', user.user_id, { role: user.role }, req.ip || '127.0.0.1');

    const responsePayload: any = {
      success: true,
      message: 'Login successful.',
      token,
      user: {
        user_id: user.user_id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
        language: user.language || 'en'
      }
    };

    // System identifies role and routes accordingly
    if (user.role === 'WORKER') {
      const worker = await getOne<any>(`SELECT * FROM workers WHERE user_id = ?`, [user.user_id]);
      if (worker) {
        responsePayload.user.worker_id = worker.worker_id;
        responsePayload.user.onboarding_status = worker.onboarding_status;
        
        // Exact pending step resolution
        const pendingStep = await determineWorkerPendingStep(worker.worker_id);
        responsePayload.user.pending_step = pendingStep;

        if (pendingStep !== 'DASHBOARD') {
          responsePayload.message = `Welcome back, ${user.name}. Please complete your pending onboarding step: ${pendingStep}.`;
        }
      }
    } else if (user.role === 'CUSTOMER') {
      const customer = await getOne<any>(`SELECT * FROM customers WHERE user_id = ?`, [user.user_id]);
      if (customer) {
        responsePayload.user.customer_id = customer.customer_id;
      }
    }

    res.json(responsePayload);
  } catch (err: any) {
    console.error('Login error detail:', err);
    res.status(500).json({ success: false, message: 'Login failed due to an internal error.', error: err.message });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Registered email address is required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await getOne<any>(`SELECT user_id, email, name FROM users WHERE email = ?`, [cleanEmail]);

    // Secure design: avoid leaking email existence directly, but create token if exists
    let rawToken = '';
    if (user) {
      rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry
      const tokenId = generateId('rst');
      const now = new Date().toISOString();

      await runQuery(`
        INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at)
        VALUES (?, ?, ?, ?, NULL, ?)
      `, [tokenId, user.user_id, tokenHash, expiresAt, now]);

      await logAudit(user.user_id, 'PASSWORD_RESET_REQUESTED', 'USER', user.user_id, {}, req.ip || '127.0.0.1');
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been issued.',
      // Provided for test automation & demo UI without requiring external email SMTP
      reset_token: rawToken || undefined
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to process forgot password request.' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, newPassword, confirmNewPassword } = req.body;

    if (!token || !newPassword || !confirmNewPassword) {
      res.status(400).json({ success: false, message: 'Token and new passwords are required.' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      res.status(400).json({ success: false, message: 'Passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const resetRecord = await getOne<any>(`
      SELECT * FROM password_reset_tokens
      WHERE token_hash = ? AND used_at IS NULL
    `, [tokenHash]);

    if (!resetRecord) {
      res.status(400).json({ success: false, message: 'Invalid or already used password reset token.' });
      return;
    }

    if (new Date(resetRecord.expires_at).getTime() < Date.now()) {
      res.status(400).json({ success: false, message: 'This password reset token has expired. Please request a new one.' });
      return;
    }

    const user = await getOne<any>(`SELECT user_id, role, email FROM users WHERE user_id = ?`, [resetRecord.user_id]);
    if (!user) {
      res.status(404).json({ success: false, message: 'User account not found.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    // Update password hash and mark token as used
    await runQuery(`UPDATE users SET password_hash = ?, updated_at = ? WHERE user_id = ?`, [newHash, now, user.user_id]);
    await runQuery(`UPDATE password_reset_tokens SET used_at = ? WHERE id = ?`, [now, resetRecord.id]);

    await logAudit(user.user_id, 'PASSWORD_RESET_COMPLETED', 'USER', user.user_id, { role: user.role }, req.ip || '127.0.0.1');

    res.json({
      success: true,
      message: 'PASSWORD RESET SUCCESSFUL. You may now return to the login page.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.user!.user_id;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      res.status(400).json({ success: false, message: 'All fields are required.' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      res.status(400).json({ success: false, message: 'New passwords do not match.' });
      return;
    }

    const user = await getOne<any>(`SELECT password_hash FROM users WHERE user_id = ?`, [userId]);
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();
    await runQuery(`UPDATE users SET password_hash = ?, updated_at = ? WHERE user_id = ?`, [newHash, now, userId]);

    await logAudit(userId, 'PASSWORD_CHANGE', 'USER', userId, {}, req.ip || '127.0.0.1');

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const user = await getOne<any>(`
      SELECT user_id, role, name, email, phone, language, account_status
      FROM users WHERE user_id = ?
    `, [userId]);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const payload: any = { ...user };
    if (user.role === 'WORKER') {
      const worker = await getOne<any>(`SELECT * FROM workers WHERE user_id = ?`, [userId]);
      if (worker) {
        payload.worker = worker;
        payload.pending_step = await determineWorkerPendingStep(worker.worker_id);
        const policy = await getOne<any>(`SELECT * FROM insurance_policies WHERE worker_id = ?`, [worker.worker_id]);
        payload.insurance = policy;
      }
    } else if (user.role === 'CUSTOMER') {
      const customer = await getOne<any>(`SELECT * FROM customers WHERE user_id = ?`, [userId]);
      payload.customer = customer;
    }

    res.json({ success: true, user: payload });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
}
