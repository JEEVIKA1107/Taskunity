import crypto from 'crypto';

if (!globalThis.crypto) {
  (globalThis as any).crypto = (crypto as any).webcrypto || crypto;
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

export function generateUuid(): string {
  return crypto.randomBytes(16).toString('hex');
}
