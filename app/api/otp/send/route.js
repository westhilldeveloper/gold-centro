// D:\gold-centro\app\api\otp\send\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { sendOtpSms } from '../../../../lib/sendoxi'; // <-- Import our Sendoxi helper

export async function POST(req) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    // 1. Fetch the user to get their phone number
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    if (!user || !user.phone) {
      return NextResponse.json({ success: false, error: 'User phone number not found' }, { status: 404 });
    }

    // 2. Generate a real random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Store the real OTP in the DB
    await prisma.oTP.create({
      data: {
        userId,
        code: otpCode,
        expiresAt: new Date(Date.now() + 5 * 60000), // Valid for 5 minutes
      },
    });

    // 4. Send the SMS via Sendoxi
    try {
      await sendOtpSms({ to: user.phone, otp: otpCode });
    } catch (smsError) {
      console.error('Sendoxi SMS failed:', smsError);
      return NextResponse.json(
        { success: false, error: `Failed to send SMS: ${smsError.message}` },
        { status: 502 } // Bad Gateway (third-party error)
      );
    }

    // 5. Return success
    return NextResponse.json({ 
      success: true, 
      message: 'OTP sent successfully',
      // ONLY return the code in development mode for easier debugging.
      // In production, this will be omitted for security.
      ...(process.env.NODE_ENV === 'development' && { dummyCode: otpCode }) 
    });

  } catch (err) {
    console.error('OTP send error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}