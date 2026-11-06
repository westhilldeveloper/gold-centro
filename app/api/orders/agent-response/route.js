import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { orderId, agentId, action, offerPrice, comment } = await req.json();

    if (!orderId || !agentId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    if (order.agentId !== agentId) throw new Error('Not your order');

    let updated;
    if (action === 'accept_admin_offer') {
      if (!order.adminOffer) throw new Error('No admin offer to accept');
      updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          finalPrice: order.adminOffer,
          status: 'CUSTOMER_PENDING_ACCEPTANCE',
        },
      });
    } else if (action === 'counter_offer') {
      if (!offerPrice) throw new Error('Offer price required');
      updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          agentOffer: offerPrice,
          status: 'NEGOTIATING',
          comment: comment || null,
        },
      });
    } else if (action === 'close_deal') {
      updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'DEAL_CLOSED',
          comment: comment || 'Deal closed by agent',
        },
      });
    } else {
      throw new Error('Invalid action');
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}