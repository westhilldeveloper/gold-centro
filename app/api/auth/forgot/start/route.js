import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { normalizePhone } from '../../../../../lib/server/phone';
import { issueAndSendAuthOtp } from '../../../../../lib/server/authOtp';
import { signTemp, setTempCookie } from '../../../../../lib/server/tempToken';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { phone: rawPhone, role } = await req.json();
    const phone = normalizePhone(rawPhone);

    let dummyCode = null;

    // Do not leak whether the phone exists.
    if (phone) {
      const user = await prisma.user.findUnique({ where: { phone } });
      if (user && user.password && (!role || user.role === role)) {
        try {
          dummyCode = await issueAndSendAuthOtp(user);
        } catch { /* swallow cooldown / provider errors */ }
      }
    }

    const res = NextResponse.json({
      success: true,
      message: 'If this number is registered, an OTP has been sent.',
      ...(process.env.NODE_ENV === 'development' && dummyCode ? { dummyCode } : {}),
    });

    if (dummyCode) {
      // We need the user id again — cheaply look it up once
      const user = await prisma.user.findUnique({ where: { phone: normalizePhone(rawPhone) } });
      if (user) {
        setTempCookie(res, 'reset_token',
          signTemp({ userId: user.id, purpose: 'reset-password' }, '10m'));
      }
    }
    return res;
  } catch {
    return NextResponse.json({
      success: true,
      message: 'If this number is registered, an OTP has been sent.',
    });
  }
}