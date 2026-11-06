import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { orderId, actualWeight } = await req.json();

    // 1. Get the order
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    // 2. Get the latest admin rate
    const rate = await prisma.goldRate.findFirst({
      where: { expiryTime: { gt: new Date() } },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!rate) throw new Error('No active rate set by admin');

    const pricePerGram = order.purity === '24K' ? rate.rate24k : rate.rate22k;
    const finalOffer = actualWeight * pricePerGram;

    // 3. Update order
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        finalOffer,
        adminRateUsed: pricePerGram,
        status: 'PRICE_NEGOTIATION',
      },
    });

    // Emit socket event to customer (show popup)
    // socket.to(`order_${orderId}`).emit('offer-generated', { finalOffer });

    return NextResponse.json({ success: true, finalOffer, pricePerGram });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}