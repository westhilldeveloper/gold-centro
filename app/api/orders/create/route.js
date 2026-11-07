import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req) {
  try {
    const body = await req.json();
    const { customerId, weight, purity, estimatedTotal, lat, lng } = body;

    // Generate QR Secret (encrypted payload)
    const qrSecret = crypto.randomBytes(32).toString('hex');

    const order = await prisma.order.create({
      data: {
        customerId,
        weight,
        purity,
        estimatedTotal,
        customerLat: lat,
        customerLng: lng,
        qrSecret,
        status: 'DRAFT',
      },
    });

  

    return NextResponse.json({ success: true, order });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
} 

