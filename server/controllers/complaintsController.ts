import { Response } from 'express';
import { getOne, getAll, runQuery } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export async function submitComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const userRole = req.user!.role;
    const { category, priority, description, bookingId } = req.body;

    if (!category || !priority || !description) {
      res.status(400).json({ success: false, message: 'Category, priority, and description are mandatory.' });
      return;
    }

    const complaintId = `CMP-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    await runQuery(`
      INSERT INTO complaints (complaint_id, user_id, user_role, booking_id, category, priority, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Submitted', ?)
    `, [complaintId, userId, userRole, bookingId || null, category, priority, description, now]);

    await logAudit(userId, 'COMPLAINT_FILED', 'COMPLAINT', complaintId, { category, priority }, req.ip || '127.0.0.1');

    res.status(201).json({
      success: true,
      message: 'Complaint registered ✓ Priority: ' + priority + '. Assigned to cooperative support desk.',
      complaint_id: complaintId
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to submit complaint.' });
  }
}

export async function getMyComplaints(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const complaints = await getAll<any>(`
      SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC
    `, [userId]);

    res.json({ success: true, complaints });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch complaints.' });
  }
}
