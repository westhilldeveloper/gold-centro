import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { agentId, branchId, orderIds, notes, receivedBy } = await req.json();

    if (!agentId || !branchId || !orderIds || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'agentId, branchId, and orderIds are required' },
        { status: 400 }
      );
    }

    // Fetch the orders to validate
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        agentId,
        status: 'COMPLETED',
        depositedToBranch: false,
      },
    });

    if (orders.length !== orderIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some orders are invalid or already deposited' },
        { status: 400 }
      );
    }

    // Group by purity for the deposit record (we create one deposit per purity)
    const byPurity = {};
    orders.forEach((o) => {
      if (!byPurity[o.purity]) byPurity[o.purity] = { weight: 0, ids: [] };
      byPurity[o.purity].weight += o.weight;
      byPurity[o.purity].ids.push(o.id);
    });

    // Create deposits in a transaction and update orders
    const deposits = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const [purity, data] of Object.entries(byPurity)) {
        const deposit = await tx.agentDeposit.create({
          data: {
            agentId,
            branchId,
            weight: data.weight,
            purity,
            orderIds: data.ids,
            notes: notes || null,
            receivedBy: receivedBy || null,
          },
        });
        created.push(deposit);
      }

      // Mark all orders as deposited
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: {
          depositedToBranch: true,
          depositedAt: new Date(),
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, deposits });
  } catch (error) {
    console.error('Deposit error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}