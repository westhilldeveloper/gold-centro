import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { signToken } from '../../../../../lib/server/auth';
import { hashPassword, validatePasswordStrength } from '../../../../../lib/server/password';
import { verifyTemp, setTempCookie, clearCookie, publicUser } from '../../../../../lib/server/tempToken';

export const runtime = 'nodejs';

const err = (status, message) =>
  NextResponse.json({ success: false, error: message }, { status });

export async function POST(req) {
  try {
    let decoded;
    try {
      decoded = verifyTemp(req.cookies.get('pwd_setup')?.value, 'set-password');
    } catch {
      return err(401, 'Password setup session expired. Please start again.');
    }

    const { password, confirmPassword } = await req.json();
    if (password !== confirmPassword) return err(400, 'Passwords do not match');
    const weak = validatePasswordStrength(password);
    if (weak) return err(400, weak);

    const hash = await hashPassword(password);
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hash },
    });

    const token = signToken({ id: user.id, role: user.role });
    const isProd = process.env.NODE_ENV === 'production';

    const res = NextResponse.json({ success: true, token, user: publicUser(user) });
    clearCookie(res, 'pwd_setup');
    res.cookies.set('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return res;
  } catch (e) {
    return err(e.status || 500, e.message || 'Could not set password');
  }
}