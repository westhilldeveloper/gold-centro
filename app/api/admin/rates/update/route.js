import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { rates, serviceChargePercent, adminId } = await req.json();

    if (!rates || typeof rates !== 'object' || Object.keys(rates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'rates object is required (e.g., { "24K": 8750 })' },
        { status: 400 }
      );
    }
    if (!adminId) {
      return NextResponse.json({ success: false, error: 'adminId required' }, { status: 400 });
    }

    // Expire all active rates
    await prisma.goldRate.updateMany({
      where: { expiryTime: { gt: new Date() } },
      data: { expiryTime: new Date() },
    });

    // Create new rate
    const now = new Date();
    const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const newRate = await prisma.goldRate.create({
      data: {
        rates: rates,                                  // stored as JSON
        serviceChargePercent: parseFloat(serviceChargePercent) || 0,
        effectiveFrom: now,
        expiryTime: expiry,
        updatedBy: adminId,
      },
    });

    return NextResponse.json({ success: true, rate: newRate });
  } catch (error) {
    console.error('Update rate error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}