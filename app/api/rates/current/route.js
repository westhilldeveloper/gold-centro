import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Try active rate
    let rate = await prisma.goldRate.findFirst({
      where: { expiryTime: { gt: new Date() } },
      orderBy: { effectiveFrom: 'desc' },
    });

    let stale = false;

    // 2. Fall back to the latest rate even if expired
    if (!rate) {
      rate = await prisma.goldRate.findFirst({
        orderBy: { effectiveFrom: 'desc' },
      });
      stale = !!rate;
    }

    if (!rate) {
      return NextResponse.json(
        { success: false, error: 'No rate configured' },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, rate, stale });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}