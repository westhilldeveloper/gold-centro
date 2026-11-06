import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { orderId, adminId, action, offerPrice, comment } = await req.json();

    if (!orderId || !adminId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    let updated;
    if (action === 'accept_agent_offer') {
      // Accept agent's offer as final
      if (!order.agentOffer) throw new Error('No agent offer to accept');
      updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          finalPrice: order.agentOffer,
          status: 'CUSTOMER_PENDING_ACCEPTANCE',
        },
      });
    } else if (action === 'propose_offer') {
      if (!offerPrice) throw new Error('Offer price required');
      updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          adminOffer: offerPrice,
          status: 'ADMIN_OFFER_SENT',
          comment: comment || null,
        },
      });

     global.io?.to('admin').emit('offer-updated', order);
// The agent + customer can also react if they subscribe
global.io?.to(`user:${order.agentId}`).emit('offer-updated', order);
global.io?.to(`user:${order.customerId}`).emit('offer-updated', order);
    } else {
      throw new Error('Invalid action');
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}