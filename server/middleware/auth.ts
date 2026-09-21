import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getOne } from '../db/database';

export const JWT_SECRET = process.env.JWT_SECRET || 'task_unity_secure_jwt_secret_key_2026';

export interface AuthenticatedUser {
  user_id: string;
  role: 'WORKER' | 'CUSTOMER' | 'ADMIN';
  email: string;
  name: string;
  phone: string;
  language: string;
  worker_id?: string;
  customer_id?: string;
  onboarding_status?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await getOne<any>(`
      SELECT user_id, role, name, email, phone, language, account_status
      FROM users WHERE user_id = ?
    `, [decoded.user_id]);

    if (!user || user.account_status !== 'ACTIVE') {
      res.status(401).json({ success: false, message: 'Invalid or suspended account session.' });
      return;
    }

    const authUser: AuthenticatedUser = {
      user_id: user.user_id,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      language: user.language || 'en'
    };

    if (user.role === 'WORKER') {
      const worker = await getOne<any>(`
        SELECT worker_id, onboarding_status, insurance_contribution_enabled
        FROM workers WHERE user_id = ?
      `, [user.user_id]);
      if (worker) {
        authUser.worker_id = worker.worker_id;
        authUser.onboarding_status = worker.onboarding_status;
      }
    } else if (user.role === 'CUSTOMER') {
      const customer = await getOne<any>(`
        SELECT customer_id FROM customers WHERE user_id = ?
      `, [user.user_id]);
      if (customer) {
        authUser.customer_id = customer.customer_id;
      }
    }

    req.user = authUser;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Session expired or invalid token. Please log in again.' });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to access this resource.'
      });
      return;
    }

    next();
  };
}

export const requireAdmin = requireRole(['ADMIN']);
export const requireWorker = requireRole(['WORKER']);
export const requireCustomer = requireRole(['CUSTOMER']);
