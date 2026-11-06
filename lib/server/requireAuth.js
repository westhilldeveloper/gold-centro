// lib/server/requireAuth.js
import { verifyToken } from './auth';
import { NextResponse } from 'next/server';

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

/**
 * Read + verify the JWT from the request's `token` cookie.
 * @returns {{ id: string, role: string } | null}
 */
export function getAuthUser(req) {
  const cookies = parseCookies(req.headers.get('cookie') || '');
  const token = cookies['token'];
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Same, but throws a 401-style result object. Use in API routes:
 *   const { user, error } = requireAuth(req);
 *   if (error) return error;
 */
export function requireAuth(req) {
  const user = getAuthUser(req);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }
  return { user, error: null };
}