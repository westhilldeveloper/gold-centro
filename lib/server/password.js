// D:\gold-centro\lib\server\password.js
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ROUNDS = 12;

export function validatePasswordStrength(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(pw)) return 'Password must contain at least one letter';
  if (!/\d/.test(pw))       return 'Password must contain at least one number';
  return null;
}

export async function hashPassword(plain, { skipValidation = false } = {}) {
  if (!skipValidation) {
    const weak = validatePasswordStrength(plain);
    if (weak) {
      throw Object.assign(new Error(weak), { code: 'WEAK_PASSWORD' });
    }
  }
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain, stored) {
  if (!stored || typeof plain !== 'string') return false;

  // Legacy plaintext row (any value not in bcrypt format `$2a$…` / `$2b$…`).
  // Constant-time compare so length/prefix is not leaked through timing.
  if (!stored.startsWith('$2')) {
    try {
      const a = Buffer.from(plain);
      const b = Buffer.from(stored);
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  try {
    return await bcrypt.compare(plain, stored);
  } catch {
    // Malformed hash in DB → treat as failed login, never crash the route
    return false;
  }
}