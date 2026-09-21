import { Response } from 'express';
import { getOne, getAll, runQuery } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export async function submitFeedback(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const userRole = req.user!.role;
    const { category, description } = req.body;

    if (!category || !description) {
      res.status(400).json({ success: false, message: 'Feedback category and description are required.' });
      return;
    }

    const feedbackId = `FB-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    await runQuery(`
      INSERT INTO feedback (feedback_id, user_id, user_role, category, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'Under Review', ?)
    `, [feedbackId, userId, userRole, category, description, now]);

    await logAudit(userId, 'FEEDBACK_SUBMITTED', 'FEEDBACK', feedbackId, { category }, req.ip || '127.0.0.1');

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully. Thank you for strengthening the cooperative.',
      feedback_id: feedbackId
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to submit feedback.' });
  }
}

export async function getMyFeedback(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const feedbackList = await getAll<any>(`
      SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC
    `, [userId]);

    res.json({ success: true, feedback: feedbackList });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch feedback history.' });
  }
}
