// lib/server/auth.js
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET env var is required');

/**
 * Sign a JWT for a user.
 * @param {{ id: string, role: string }} user
 * @returns {string}
 */
export function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), role: user.role },
    SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify a JWT. Throws on invalid/expired.
 * @param {string} token
 * @returns {{ id: string, role: string }}
 */
export function verifyToken(token) {
  const p = jwt.verify(token, SECRET);
  if (!p?.sub || !p?.role) throw new Error('JWT missing sub or role');
  return { id: String(p.sub), role: p.role };
}