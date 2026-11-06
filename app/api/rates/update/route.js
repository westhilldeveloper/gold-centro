import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { rates, serviceChargePercent, adminId } = await req.json();

    // Validate rates object
    if (!rates || typeof rates !== 'object' || Object.keys(rates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'rates object is required, e.g. { "24K": 8750, "22K": 8050 }',
        },
        { status: 400 }
      );
    }
    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'adminId is required' },
        { status: 400 }
      );
    }

    // Sanitize: only keep numeric positive values
    const cleaned = {};
    Object.entries(rates).forEach(([karat, value]) => {
      const num = parseFloat(value);
      if (!isNaN(num) && num > 0) cleaned[karat] = num;
    });

    if (Object.keys(cleaned).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid rates provided' },
        { status: 400 }
      );
    }

    // Expire all currently active rates
    await prisma.goldRate.updateMany({
      where: { expiryTime: { gt: new Date() } },
      data: { expiryTime: new Date() },
    });

    // Create new rate entry (valid 24 hours)
    const now = new Date();
    const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const newRate = await prisma.goldRate.create({
      data: {
        rates: cleaned,
        serviceChargePercent: parseFloat(serviceChargePercent) || 0,
        effectiveFrom: now,
        expiryTime: expiry,
        updatedBy: adminId,
      },
    });
    global.io?.to('admin').emit('rate-updated', newRate);
    return NextResponse.json({ success: true, rate: newRate });
  } catch (error) {
    console.error('Update rate error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}