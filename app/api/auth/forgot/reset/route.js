import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { hashPassword, validatePasswordStrength } from '../../../../../lib/server/password';
import { verifyTemp, clearCookie } from '../../../../../lib/server/tempToken';

export const runtime = 'nodejs';

const err = (status, message) =>
  NextResponse.json({ success: false, error: message }, { status });

export async function POST(req) {
  try {
    let decoded;
    try {
      decoded = verifyTemp(req.cookies.get('pwd_setup')?.value, 'set-password');
    } catch {
      return err(401, 'Reset session expired. Please start again.');
    }

    const { password, confirmPassword } = await req.json();
    if (password !== confirmPassword) return err(400, 'Passwords do not match');
    const weak = validatePasswordStrength(password);
    if (weak) return err(400, weak);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: await hashPassword(password) },
    });

    const res = NextResponse.json({ success: true });
    clearCookie(res, 'pwd_setup');
    return res;
  } catch (e) {
    return err(e.status || 500, e.message || 'Could not reset password');
  }
}