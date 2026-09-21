import { runQuery } from '../db/database';
import { generateId } from '../utils/idGenerator';

export async function logAudit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, any> = {},
  ipAddress: string = '127.0.0.1'
): Promise<void> {
  const logId = generateId('log');
  const now = new Date().toISOString();
  await runQuery(`
    INSERT INTO audit_logs (log_id, user_id, action, entity_type, entity_id, details_json, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [logId, userId, action, entityType, entityId, JSON.stringify(details), ipAddress, now]);
}
