import { NextResponse } from 'next/server';
import { consumeAuthOtp } from '../../../../../lib/server/authOtp';
import { signTemp, verifyTemp, setTempCookie, clearCookie } from '../../../../../lib/server/tempToken';

export const runtime = 'nodejs';

const err = (status, message) =>
  NextResponse.json({ success: false, error: message }, { status });

export async function POST(req) {
  try {
    let decoded;
    try {
      decoded = verifyTemp(req.cookies.get('reg_token')?.value, 'register');
    } catch {
      return err(401, 'Registration session expired. Please start again.');
    }

    const { code } = await req.json();
    if (!/^\d{6}$/.test(String(code || ''))) return err(400, 'Enter the 6-digit code');

    await consumeAuthOtp(decoded.userId, code);

    const res = NextResponse.json({ success: true });
    clearCookie(res, 'reg_token');
    setTempCookie(res, 'pwd_setup', signTemp({ userId: decoded.userId, purpose: 'set-password' }, '10m'));
    return res;
  } catch (e) {
    return err(e.status || 500, e.message || 'Verification failed');
  }
}