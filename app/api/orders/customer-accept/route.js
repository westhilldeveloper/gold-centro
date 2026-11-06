import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { orderId, customerId, action, comment } = await req.json();

    if (!orderId || !customerId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    if (order.customerId !== customerId) throw new Error('Not your order');
    if (order.status !== 'CUSTOMER_PENDING_ACCEPTANCE') {
      throw new Error('Order not ready for customer acceptance');
    }

    let updated;

    if (action === 'accept') {
      let branchId = null;
      if (order.agentId) {
        const agent = await prisma.user.findUnique({
          where: { id: order.agentId },
          select: { branchId: true },
        });
        branchId = agent?.branchId || null;
      }

      updated = await prisma.$transaction(async (tx) => {
  const updatedOrder = await tx.order.update({
    where: { id: orderId },
    data: {
      status: 'COMPLETED',
      finalPrice: order.finalPrice,
      branchId,
      depositedToBranch: false,

      // ✅ NEW: record acknowledgment
      receiptAcknowledgedAt: new Date(),
      receiptAcknowledgedBy: customerId,
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      agent:    { select: { id: true, name: true, phone: true } },
      items:    true,
    },
  });

  const purchaseAmount = order.finalPrice || order.agentOffer || 0;
  if (order.agentId && purchaseAmount > 0) {
    await tx.agentCashTransaction.create({
      data: {
        agentId: order.agentId,
        type: 'DEBIT',
        amount: purchaseAmount,
        purpose: 'Gold purchase from customer',
        description: `Order #${orderId.slice(-8)}`,
        reference: orderId,
        createdBy: order.agentId,
      },
    });
  }

  return updatedOrder;
});
    } else if (action === 'reject') {
      updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'REJECTED_BY_CUSTOMER',
          comment: comment || 'Customer rejected the offer',
        },
        // 🔥 RELATIONS
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          agent:    { select: { id: true, name: true, phone: true } },
          items:    true,
        },
      });
    } else {
      throw new Error('Invalid action');
    }

    // 🔥 EMIT ONCE, AFTER EITHER BRANCH — uses `updated`, not `order`
    if (globalThis.io) {
      globalThis.io.to(`customer:${updated.customerId}`).emit('order-updated', updated);
      if (updated.agentId) {
        globalThis.io.to(`agent:${updated.agentId}`).emit('order-updated', updated);
      }
      globalThis.io.to('admin').emit('offer-updated', updated);
      console.log(`📤 Customer ${action} → emitted order-updated for ${updated.id}`);
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    console.error('Customer accept error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}