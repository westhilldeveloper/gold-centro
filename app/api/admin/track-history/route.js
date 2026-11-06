import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const branchId = searchParams.get('branchId') || '';
    const purity = searchParams.get('purity') || '';

    // Fetch all items
    const items = await prisma.orderItem.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            purity: true,
            status: true,
            paymentMode: true,
            finalPrice: true,
            depositedToBranch: true,
            createdAt: true,
            customer: { select: { id: true, name: true, phone: true } },
            agent: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    });

    // Fetch all branches for location mapping
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true, code: true },
    });
    const branchMap = {};
    branches.forEach((b) => {
      branchMap[b.id] = b;
    });

    // Fetch in-transit movements (items currently moving)
    const inTransitMovements = await prisma.stockMovement.findMany({
      where: { status: 'IN_TRANSIT' },
      select: {
        id: true,
        itemIds: true,
        toBranchId: true,
        fromBranchId: true,
      },
    });
    const inTransitByItem = {};
    inTransitMovements.forEach((m) => {
      (m.itemIds || []).forEach((id) => {
        inTransitByItem[id] = {
          movementId: m.id,
          fromBranch: m.fromBranchId ? branchMap[m.fromBranchId] : null,
          toBranch: m.toBranchId ? branchMap[m.toBranchId] : null,
        };
      });
    });

    // Enrich items with location info
    let enriched = items.map((it) => {
      let location = 'Unknown';
      let locationType = 'UNKNOWN';
      let locationBranch = null;

      if (inTransitByItem[it.id]) {
        const transit = inTransitByItem[it.id];
        location = `In transit to ${transit.toBranch?.name || 'destination'}`;
        locationType = 'IN_TRANSIT';
        locationBranch = transit.toBranch;
      } else if (it.currentBranchId && branchMap[it.currentBranchId]) {
        locationBranch = branchMap[it.currentBranchId];
        location = `At ${locationBranch.name}`;
        locationType = 'AT_BRANCH';
      } else if (
        it.order?.status === 'COMPLETED' &&
        !it.order?.depositedToBranch
      ) {
        location = `With agent ${it.order.agent?.name || ''}`;
        locationType = 'WITH_AGENT';
      } else if (it.order?.status && it.order.status !== 'COMPLETED') {
        location = `Order ${it.order.status.replace(/_/g, ' ')}`;
        locationType = 'IN_PROGRESS';
      }

      return {
        ...it,
        location,
        locationType,
        locationBranch,
      };
    });

    // Filters
    if (search) {
      const term = search.toLowerCase();
      enriched = enriched.filter(
        (it) =>
          it.name?.toLowerCase().includes(term) ||
          it.order?.id?.toLowerCase().includes(term) ||
          it.order?.customer?.name?.toLowerCase().includes(term) ||
          it.order?.customer?.phone?.includes(term) ||
          it.order?.agent?.name?.toLowerCase().includes(term)
      );
    }

    if (branchId) {
      enriched = enriched.filter((it) => it.currentBranchId === branchId);
    }

    if (purity) {
      enriched = enriched.filter((it) => it.order?.purity === purity);
    }

    return NextResponse.json({
      success: true,
      items: enriched,
      branches,
      total: enriched.length,
    });
  } catch (error) {
    console.error('Track history error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}