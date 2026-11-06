// D:\gold-centro\app\api\branch\deposit\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { agentId, branchId, orderIds, receivedBy, notes } = await req.json();

    if (!agentId || !branchId || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'agentId, branchId, orderIds are required' },
        { status: 400 }
      );
    }
    if (!receivedBy) {
      return NextResponse.json(
        { success: false, error: 'receivedBy is required' },
        { status: 400 }
      );
    }

    // Fetch only orders that are actually eligible (still in custody for this agent)
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        agentId,
        depositedToBranch: false,
      },
      include: { items: true },
    });

    if (orders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No eligible orders found' },
        { status: 404 }
      );
    }

    // Group by purity (AgentDeposit.purity is a single value per row)
    const byPurity = {};
    orders.forEach((o) => {
      const p = o.purity || 'Unknown';
      if (!byPurity[p]) byPurity[p] = { orders: [], weight: 0 };
      byPurity[p].orders.push(o);
      byPurity[p].weight += o.weight || 0;
    });

    // Transaction: create deposits + flip flags + move items to branch stock
    const result = await prisma.$transaction(async (tx) => {
      const createdDeposits = [];

      for (const [purity, group] of Object.entries(byPurity)) {
        const deposit = await tx.agentDeposit.create({
          data: {
            agentId,
            branchId,
            weight: group.weight,
            purity,
            orderIds: group.orders.map((o) => o.id),
            notes: notes || null,
            receivedBy,
            depositedAt: new Date(),
          },
        });
        createdDeposits.push(deposit);
      }

      const allOrderIds = orders.map((o) => o.id);

      // Mark orders as deposited AND record which branch took them
      await tx.order.updateMany({
        where: { id: { in: allOrderIds } },
        data: {
          depositedToBranch: true,
          depositedAt: new Date(),
          branchId, // authoritative branch — the one that received the gold
        },
      });

      // ✅ THE MISSING PIECE: move items into branch stock
      await tx.orderItem.updateMany({
        where: { orderId: { in: allOrderIds } },
        data: { currentBranchId: branchId },
      });

      return createdDeposits;
    });

    return NextResponse.json({ success: true, deposits: result });
  } catch (error) {
    console.error('Branch deposit error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}