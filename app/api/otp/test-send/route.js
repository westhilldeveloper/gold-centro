// app/api/otp/test-send/route.js
import { NextResponse } from 'next/server';
import { verifyCredentials, sendOtpSms } from '../../../../lib/sendoxi';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get('to');

  if (!to) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Pass a phone number: /api/otp/test-send?to=9876543210 (10 digits or 91XXXXXXXXXX)',
      },
      { status: 400 }
    );
  }

  // 1. Verify auth
  try {
    await verifyCredentials();
  } catch (err) {
    return NextResponse.json(
      { success: false, step: 'auth', error: err.message },
      { status: 500 }
    );
  }

  // 2. Send test OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const result = await sendOtpSms({ to, otp });
    return NextResponse.json({
      success: true,
      message: `Test OTP ${otp} sent to ${to}`,
      otp, // only for testing — remove in production
      sendoxi: result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        step: 'send',
        error: err.message,
        hint:
          'If you got a 404, the send endpoint path is wrong. ' +
          'If you got "Missing parameter X", the payload shape is wrong. ' +
          'Check your Sendoxi docs and adjust SENDOXI_BASE/endpoint in lib/sendoxi.js.',
      },
      { status: 500 }
    );
  }
}