// D:\gold-centro\app\api\admin\stock-overview\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // ---- 1. Items currently at a branch ----
    const branchItems = await prisma.orderItem.findMany({
      where: {
        currentBranchId: { not: null },
        status: 'ACTIVE',
        NOT: {
          order: {
            status: 'COMPLETED',
            depositedToBranch: false,
            agentId: { not: null },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      // `select` replaces `include` — guarantees every field we render is present.
      select: {
        id: true,
        name: true,
        count: true,
        purity: true,
        imageUrls: true,
        grossWeight: true,
        stoneWeight: true,
        dustWeight: true,
        netWeight: true,
        createdAt: true,
        currentBranchId: true,
        status: true,
        order: {
          select: {
            id: true,
            purity: true,
            paymentMode: true,
            createdAt: true,
            customer: { select: { name: true, phone: true } },
            agent: { select: { name: true } },
          },
        },
      },
    });

    // ---- 2. Branches ----
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    // ---- 3. In-transit movements ----
    const inTransitMovements = await prisma.stockMovement.findMany({
      where: { status: 'IN_TRANSIT' },
      include: {
        fromBranch: { select: { name: true, code: true } },
        toBranch: { select: { name: true, code: true } },
      },
    });

    // ---- 4. Agent custody ----
    const custodyOrders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        depositedToBranch: false,
        agentId: { not: null },
      },
      include: {
        agent: { select: { id: true, name: true, phone: true } },
        customer: { select: { name: true, phone: true } },
        items: {
          select: {
            id: true,
            name: true,
            count: true,
            purity: true,
            imageUrls: true,
            grossWeight: true,
            stoneWeight: true,
            dustWeight: true,
            netWeight: true,
            createdAt: true,
            currentBranchId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ---- 5. Group branch items by branch ----
    const byBranch = {};
    branches.forEach((b) => {
      byBranch[b.id] = {
        branch: b,
        items: [],
        byPurity: {},
        totalNet: 0,
        totalGross: 0,
        totalPieces: 0,
        itemCount: 0,
      };
    });

    branchItems.forEach((it) => {
      const bId = it.currentBranchId;
      if (!byBranch[bId]) return;

      const purity = it.purity || it.order?.purity || 'Unknown';
      byBranch[bId].items.push(it);

      if (!byBranch[bId].byPurity[purity]) {
        byBranch[bId].byPurity[purity] = {
          count: 0,
          totalPieces: 0,
          netWeight: 0,
          grossWeight: 0,
        };
      }
      byBranch[bId].byPurity[purity].count += 1;
      byBranch[bId].byPurity[purity].totalPieces += it.count || 0;
      byBranch[bId].byPurity[purity].netWeight += it.netWeight || 0;
      byBranch[bId].byPurity[purity].grossWeight += it.grossWeight || 0;

      byBranch[bId].totalNet += it.netWeight || 0;
      byBranch[bId].totalGross += it.grossWeight || 0;
      byBranch[bId].totalPieces += it.count || 0;
      byBranch[bId].itemCount += 1;
    });

    // ---- 6. Grand totals ----
    const grandTotals = {
      net: branchItems.reduce((s, it) => s + (it.netWeight || 0), 0),
      gross: branchItems.reduce((s, it) => s + (it.grossWeight || 0), 0),
      pieces: branchItems.reduce((s, it) => s + (it.count || 0), 0),
      items: branchItems.length,
    };

    // ---- 7. Custody totals ----
    const custodyItems = custodyOrders.flatMap((o) => o.items || []);
    const custodyTotalNet = custodyItems.reduce(
      (s, it) => s + (it.netWeight || 0),
      0
    );
    const custodyTotalGross = custodyItems.reduce(
      (s, it) => s + (it.grossWeight || 0),
      0
    );
    const custodyPieces = custodyItems.reduce(
      (s, it) => s + (it.count || 0),
      0
    );

    // ---- 8. In-transit totals ----
    const inTransitTotal = inTransitMovements.reduce(
      (s, m) => s + (m.weight || 0),
      0
    );

    return NextResponse.json({
      success: true,
      branches: Object.values(byBranch),
      grandTotals,
      custodyOrders,
      custodyItems,
      custody: {
        totalNet: custodyTotalNet,
        totalGross: custodyTotalGross,
        pieces: custodyPieces,
        orders: custodyOrders.length,
        items: custodyItems.length,
      },
      inTransitMovements,
      inTransitTotal,
    });
  } catch (error) {
    console.error('Admin stock overview error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}