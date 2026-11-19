// D:\gold-centro\app\api\auth\register\start\route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { normalizePhone } from '../../../../../lib/server/phone';
import { issueAndSendAuthOtp } from '../../../../../lib/server/authOtp';
import { signTemp, setTempCookie } from '../../../../../lib/server/tempToken';

export const runtime = 'nodejs';

const err = (status, message) =>
  NextResponse.json({ success: false, error: message }, { status });

export async function POST(req) {
  try {
    const { phone: rawPhone, name, role } = await req.json();
    const phone = normalizePhone(rawPhone);
    if (!phone) return err(400, 'Enter a valid 10-digit phone number');
    if (!['CUSTOMER', 'AGENT', 'ADMIN'].includes(role)) return err(400, 'Invalid role');
    if (role === 'ADMIN' && process.env.ALLOW_ADMIN_REGISTER !== 'true')
      return err(403, 'Admin registration is disabled. Please contact the administrator.');

    let user = await prisma.user.findUnique({ where: { phone } });

    if (user) {
      if (user.role !== role)
        return err(409, `This phone is already registered as ${user.role.toLowerCase()}`);
      if (user.password)
        return err(409, 'This phone is already registered. Please login instead.');
      // incomplete earlier registration → allow to continue
      if (name && name.trim() && name.trim() !== user.name) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name: name.trim() },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          phone,
          name: name?.trim() || `User_${phone.slice(-4)}`,
          role,           // password intentionally left null until step 3
        },
      });
    }

    const code = await issueAndSendAuthOtp(user);

    const res = NextResponse.json({
      success: true,
      message: 'OTP sent',
      ...(process.env.NODE_ENV === 'development' && { dummyCode: code }),
    });
    setTempCookie(res, 'reg_token', signTemp({ userId: user.id, purpose: 'register' }, '10m'));
    return res;
  } catch (e) {
    return err(e.status || 500, e.message || 'Something went wrong');
  }
}