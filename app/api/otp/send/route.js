import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { userId } = await req.json();
    const dummyCode = '123456'; // Hardcoded for testing

    // Store in DB
    await prisma.oTP.create({
      data: {
        userId,
        code: dummyCode,
        expiresAt: new Date(Date.now() + 5 * 60000),
      },
    });

    return NextResponse.json({ success: true, dummyCode });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}