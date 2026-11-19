import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { signToken } from '../../../../lib/server/auth';
import { normalizePhone } from '../../../../lib/server/phone';
import { verifyPassword, hashPassword } from '../../../../lib/server/password';
import { publicUser } from '../../../../lib/server/tempToken';

export const runtime = 'nodejs';

const err = (status, message) =>
  NextResponse.json({ success: false, error: message }, { status });

export async function POST(req) {
  try {
    const { phone: rawPhone, password, role } = await req.json();
    const phone = normalizePhone(rawPhone);
    if (!phone || !password) return err(400, 'Phone and password are required');

    // (optional) rate limit here — see notes above
    // const { success: allowed } = await ratelimit.limit(`login:${phone}`);
    // if (!allowed) return err(429, 'Too many attempts. Try again later.');

    const user = await prisma.user.findUnique({ where: { phone } });

    // Single generic failure for every rejection reason — no oracle
    const fail = () => err(401, 'Invalid phone number or password');

    if (!user || !user.password) return fail();

    const ok = await verifyPassword(password, user.password);
    if (!ok) return fail();

    // Role mismatch also uses the generic error — see note above
    if (role && user.role !== role) return fail();

    // Lazy migration: plaintext (or any non-bcrypt) → bcrypt on first success
    if (!user.password.startsWith('$2')) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { password: await hashPassword(password) },
        });
      } catch (e) {
        console.warn('user rehash failed (non-fatal)', e);
      }
    }

    const token = signToken({ id: user.id, role: user.role });
    const isProd = process.env.NODE_ENV === 'production';

    const res = NextResponse.json({
      success: true,
      token,
      user: publicUser(user),
    });
    res.cookies.set('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return res;
  } catch (e) {
    console.error('Login API Error:', e);
    return err(500, 'Login failed');
  }
}