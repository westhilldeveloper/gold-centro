// D:\gold-centro\app\api\branch\stock\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) {
      return NextResponse.json(
        { success: false, error: 'branchId required' },
        { status: 400 }
      );
    }

    // ---- 1. Items physically at this branch and still ACTIVE ----
    //        Status filter excludes items already in melting/melted.
    const directItems = await prisma.orderItem.findMany({
      where: {
        currentBranchId: branchId,
        status: 'ACTIVE', // ← KEY: no IN_MELTING, no MELTED
      },
      orderBy: { createdAt: 'desc' },
      include: {
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

    // ---- 2. Fallback for legacy items where currentBranchId is null ----
    //        Also gate on ACTIVE status.
    const legacyItems = await prisma.orderItem.findMany({
      where: {
        currentBranchId: null,
        status: 'ACTIVE', // ← KEY
        order: {
          branchId: branchId,
          depositedToBranch: true,
          status: 'COMPLETED',
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
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

    // ---- 3. Auto-repair legacy items ----
    if (legacyItems.length > 0) {
      await prisma.orderItem.updateMany({
        where: { id: { in: legacyItems.map((i) => i.id) } },
        data: { currentBranchId: branchId },
      });
      console.log(
        `[AUTO-REPAIR] Fixed ${legacyItems.length} legacy items for branch ${branchId}`
      );
    }

    const items = [...directItems, ...legacyItems];

    // ---- 4. In-transit items heading to this branch ----
    //        These already have currentBranchId: null (set by the movement),
    //        so they cannot overlap with section 1. We keep the ACTIVE filter
    //        defensively in case an item was moved to melting mid-flight.
    const inTransitMovements = await prisma.stockMovement.findMany({
      where: { toBranchId: branchId, status: 'IN_TRANSIT' },
      select: { id: true, itemIds: true, fromBranchId: true },
    });

    const inTransitIds = inTransitMovements.flatMap((m) => m.itemIds || []);
    const inTransitItems =
      inTransitIds.length > 0
        ? await prisma.orderItem.findMany({
            where: {
              id: { in: inTransitIds },
              status: 'ACTIVE', // ← defensive
            },
            include: {
              order: { select: { id: true, purity: true } },
            },
          })
        : [];

    // ---- 5. Group by ITEM-level purity (falls back to order purity) ----
    const byPurity = {};
    items.forEach((it) => {
      const purity = it.purity || it.order?.purity || 'Unknown';
      if (!byPurity[purity]) {
        byPurity[purity] = {
          count: 0,
          totalPieces: 0,
          netWeight: 0,
          grossWeight: 0,
        };
      }
      byPurity[purity].count += 1;
      byPurity[purity].totalPieces += it.count || 0;
      byPurity[purity].netWeight += it.netWeight || 0;
      byPurity[purity].grossWeight += it.grossWeight || 0;
    });

    const inTransitByPurity = {};
    inTransitItems.forEach((it) => {
      const purity = it.purity || it.order?.purity || 'Unknown';
      if (!inTransitByPurity[purity]) {
        inTransitByPurity[purity] = { count: 0, netWeight: 0 };
      }
      inTransitByPurity[purity].count += 1;
      inTransitByPurity[purity].netWeight += it.netWeight || 0;
    });

    return NextResponse.json({
      success: true,
      items,
      byPurity,
      inTransitItems,
      inTransitByPurity,
    });
  } catch (error) {
    console.error('Branch stock error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}