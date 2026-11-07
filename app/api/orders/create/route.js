import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { getMobileUser } from '../../../../lib/auth-mobile';

const schema = z.object({
  weight: z.number().positive().max(10000),
  purity: z.enum(['18K', '22K', '24K']),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function POST(req) {
  try {
    // 1. Auth
    const session = await getServerSession(authOptions);
    const mobileUser = await getMobileUser(req);
    const user = session?.user ?? mobileUser;
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // 2. Validate input
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }
    const { weight, purity, lat, lng } = parsed.data;

    // 3. customerId comes from the token, not the body.
    //    (If HO/admin can create on behalf of a customer, allow that ONLY if role === 'HO'.)
    const customerId = user.id;

    // 4. Compute price server-side
    const rate = await getLiveRate(purity);          // your rate source
    const total = Math.round(weight * rate * 100) / 100;

    // 5. Create
    const qrSecret = crypto.randomBytes(32).toString('hex');
    const order = await prisma.order.create({
      data: {
        customerId,
        weight,
        purity,
        estimatedTotal: total,        // server-computed, never client-supplied
        rateAtCreation: rate,         // ← store the snapshot
        customerLat: lat,
        customerLng: lng,
        qrSecret,
        status: 'DRAFT',
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('Order create error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 });
  }
}