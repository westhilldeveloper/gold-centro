// app/api/admin/agent-custody/route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // ---- 1. Custody orders (bought but not yet deposited) ----
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        agentId: { not: null },
        depositedToBranch: false,
      },
      select: {
        id: true,
        agentId: true,
        branchId: true,
        weight: true,
        purity: true,
        finalPrice: true,
        createdAt: true,
        agent: {
          select: {
            id: true,
            name: true,
            phone: true,
            branchId: true,
            branch: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    // ---- 2. Carrier items (being transferred between branches) ----
    const carrierItems = await prisma.orderItem.findMany({
      where: {
        currentAgentId: { not: null },
        currentBranchId: null, // not yet delivered to a branch
      },
      select: {
        id: true,
        name: true,
        count: true,
        purity: true,
        grossWeight: true,
        netWeight: true,
        imageUrls: true,
        currentAgentId: true,
        order: {
          select: {
            id: true,
            purity: true,
            customer: { select: { name: true } },
          },
        },
      },
    });

    // Fetch agent records for carrier items (distinct set)
    const carrierAgentIds = [
      ...new Set(carrierItems.map((i) => i.currentAgentId).filter(Boolean)),
    ];
    const carrierAgents = carrierAgentIds.length
      ? await prisma.user.findMany({
          where: { id: { in: carrierAgentIds } },
          select: {
            id: true,
            name: true,
            phone: true,
            branchId: true,
            branch: { select: { id: true, name: true, code: true } },
          },
        })
      : [];
    const carrierAgentMap = {};
    carrierAgents.forEach((a) => {
      carrierAgentMap[a.id] = a;
    });

    // ---- 3. Group everything by agent ----
    const grouped = {};

    // 3a. Custody orders
    pendingOrders.forEach((o) => {
      if (!o.agent) return;
      const key = o.agentId;
      if (!grouped[key]) {
        grouped[key] = {
          agent: o.agent,
          orders: [],
          carrierItems: [],
          totalByPurity: {},        // custody purity totals
          carrierByPurity: {},      // carrier purity totals
          totalWeight: 0,           // custody weight
          carrierWeight: 0,         // carrier weight
        };
      }
      grouped[key].orders.push(o);
      grouped[key].totalWeight += o.weight;
      grouped[key].totalByPurity[o.purity] =
        (grouped[key].totalByPurity[o.purity] || 0) + o.weight;
    });

    // 3b. Carrier items
    carrierItems.forEach((it) => {
      const agentId = it.currentAgentId;
      const agent = carrierAgentMap[agentId];
      if (!agent) return;

      if (!grouped[agentId]) {
        grouped[agentId] = {
          agent,
          orders: [],
          carrierItems: [],
          totalByPurity: {},
          carrierByPurity: {},
          totalWeight: 0,
          carrierWeight: 0,
        };
      }
      grouped[agentId].carrierItems.push(it);
      const purity = it.purity || it.order?.purity || 'Unknown';
      grouped[agentId].carrierWeight += it.netWeight || 0;
      grouped[agentId].carrierByPurity[purity] =
        (grouped[agentId].carrierByPurity[purity] || 0) + (it.netWeight || 0);
    });

    return NextResponse.json({
      success: true,
      custody: Object.values(grouped),
    });
  } catch (error) {
    console.error('Agent custody error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}