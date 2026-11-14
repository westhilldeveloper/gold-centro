// D:\gold-centro\app\api\branch\movements\route.js
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

    const movements = await prisma.stockMovement.findMany({
      where: { OR: [{ fromBranchId: branchId }, { toBranchId: branchId }] },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        fromBranch: { select: { name: true, code: true } },
        toBranch: { select: { name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, movements });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const {
      fromBranchId,
      toBranchId,
      itemIds,
      description,
      createdBy,
      handedOverByName,
      handedOverByPhone,
      carrierType,
      carrierId,
      carrierName,
      carrierPhone,
    } = await req.json();

    if (!fromBranchId || !toBranchId || !itemIds?.length || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'fromBranchId, toBranchId, itemIds, and createdBy are required' },
        { status: 400 }
      );
    }
    if (fromBranchId === toBranchId) {
      return NextResponse.json(
        { success: false, error: 'Source and destination must differ' },
        { status: 400 }
      );
    }
    if (!carrierName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Carrier name is required' },
        { status: 400 }
      );
    }

    // ✅ NEW: detect whether an agent is physically carrying the items
    const isAgentCarrier =
      carrierType === 'AGENT' && carrierId && carrierId.trim();

    const items = await prisma.orderItem.findMany({
      where: { id: { in: itemIds }, currentBranchId: fromBranchId },
      include: { order: { select: { purity: true } } },
    });

    if (items.length !== itemIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some items are invalid or not in this branch' },
        { status: 400 }
      );
    }

    const byPurity = {};
    items.forEach((it) => {
      const purity = it.order?.purity || 'Unknown';
      if (!byPurity[purity]) byPurity[purity] = { weight: 0, ids: [] };
      byPurity[purity].weight += it.netWeight;
      byPurity[purity].ids.push(it.id);
    });

    const result = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const [purity, data] of Object.entries(byPurity)) {
        const movement = await tx.stockMovement.create({
          data: {
            fromBranchId,
            toBranchId,
            weight: data.weight,
            purity,
            status: 'IN_TRANSIT',
            description: description || null,
            createdBy,
            itemIds: data.ids,
            handedOverByName: handedOverByName?.trim() || null,
            handedOverByPhone: handedOverByPhone?.trim() || null,
            carrierType: carrierType || 'OTHER',
            carrierId: carrierId || null,
            carrierName: carrierName.trim(),
            carrierPhone: carrierPhone?.trim() || null,
          },
        });
        created.push(movement);
      }

      // Move items out of the branch. If the carrier is an agent,
      // put them into that agent's custody (currentAgentId).
      await tx.orderItem.updateMany({
        where: { id: { in: itemIds } },
        data: {
          currentBranchId: null,
          currentAgentId: isAgentCarrier ? carrierId : null,
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, movements: result });
  } catch (error) {
    console.error('Create movement error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}