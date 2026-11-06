import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const {
      orderId,
      agentId,
      weight,
      purity,
      offeredPrice,
      paymentMode,
      items,
      isPledged,
  pledgeBankName,
  pledgeLoanAccountNo,
  pledgeOutstandingAmount,
    } = await req.json();

    if (!orderId || !agentId || !offeredPrice) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    if (order.agentId !== agentId) throw new Error('Not your order');
    if (
      !['AGENT_ARRIVED', 'ADMIN_OFFER_SENT', 'NEGOTIATING'].includes(order.status)
    ) {
      throw new Error('Cannot send offer in current status');
    }

    // NEW: fetch the live rate to snapshot serviceChargePercent
    const goldRate = await prisma.goldRate.findFirst({
      where: { expiryTime: { gt: new Date() } },
      orderBy: { effectiveFrom: 'desc' },
    });
    const serviceChargePercent = goldRate?.serviceChargePercent || 0;

    // NEW: compute subtotal server-side from items (never trust client)
    const subtotal = (Array.isArray(items) ? items : []).reduce((sum, it) => {
      const net = parseFloat(it.netWeight) || 0;
      const rate = parseFloat(it.ratePerGram) || 0;
      return sum + net * rate;
    }, 0);

    const serviceChargeAmount =
      Math.round(((subtotal * serviceChargePercent) / 100) * 100) / 100; // 2 dp

    const updated = await prisma.$transaction(async (tx) => {
      // Delete previous items
      await tx.orderItem.deleteMany({ where: { orderId } });

      // Create new items
      if (Array.isArray(items) && items.length > 0) {
        await tx.orderItem.createMany({
          data: items.map((it) => {
            const net = parseFloat(it.netWeight) || 0;
            const rate = parseFloat(it.ratePerGram) || 0;
            return {
              orderId,
              name: it.name || 'Other',
              count: parseInt(it.count) || 1,
              purity: it.purity || '24K',
              imageUrls: it.imageUrls || [],
              grossWeight: parseFloat(it.grossWeight) || 0,
              stoneWeight: parseFloat(it.stoneWeight) || 0,
              dustWeight: parseFloat(it.dustWeight) || 0,
              netWeight: net,
              ratePerGram: rate,
              itemPrice: net * rate,
            };
          }),
        });
      }

      return tx.order.update({
  where: { id: orderId },
  data: {
    weight: parseFloat(weight) || order.weight,
    purity: purity || order.purity,
    agentOffer: parseFloat(offeredPrice),
    paymentMode: paymentMode || null,
    status:
      order.status === 'ADMIN_OFFER_SENT'
        ? 'NEGOTIATING'
        : 'AGENT_OFFER_SENT',

    // Existing service charge snapshot
    serviceChargePercent,
    serviceChargeAmount,

    // NEW: pledge snapshot from agent
    isPledged: !!isPledged,
    pledgeBankName: isPledged ? pledgeBankName || null : null,
    pledgeLoanAccountNo: isPledged ? pledgeLoanAccountNo || null : null,
    pledgeOutstandingAmount: isPledged
      ? Number(pledgeOutstandingAmount) || 0
      : null,
  },
  include: { items: true },
});
    });

    // Emit socket
    if (globalThis.io) {
      globalThis.io.to('admin').emit('offer-updated', updated);
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    console.error('Agent offer error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}