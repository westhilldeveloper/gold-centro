import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { emitToRoom } from '@/lib/socket-helper';

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
      if (!order.agentOffer) throw new Error('No agent offer to accept');
      
      updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          finalPrice: order.agentOffer,
          status: 'CUSTOMER_PENDING_ACCEPTANCE',
        },
        // 🔥 ADD RELATIONS SO UI DOESN'T CRASH
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          agent: { select: { id: true, name: true, phone: true } },
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
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          agent: { select: { id: true, name: true, phone: true } },
        },
      });

    } else {
      throw new Error('Invalid action');
    }

    // 🔥 FIX: Move emits OUTSIDE the if/else so they run for BOTH actions
    // 🔥 FIX: Emit `updated`, not `order`
    
    // 1. Tell all Admin tabs to refresh the approvals list
    await emitToRoom('admin', 'offer-updated', updated);
    
    // 2. Tell the specific Agent that the admin responded
    await emitToRoom(`user:${updated.agentId}`, 'offer-updated', updated);
    
    // 3. Tell the Customer to review the new offer or accepted price
    await emitToRoom(`user:${updated.customerId}`, 'order-updated', updated);

    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}