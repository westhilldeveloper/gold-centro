// D:\gold-centro\app\api\admin\stock-movements\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const movements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        fromBranch: { select: { id: true, name: true, code: true } },
        toBranch: { select: { id: true, name: true, code: true } },
      },
      take: 200,
    });

    const allItemIds = [...new Set(movements.flatMap((m) => m.itemIds || []))];

    let itemsMap = {};
    if (allItemIds.length > 0) {
      const items = await prisma.orderItem.findMany({
        where: { id: { in: allItemIds } },
        include: {
          order: {
            select: {
              id: true,
              purity: true,
              finalPrice: true,
              createdAt: true,
              customer: { select: { name: true } },
              agent: { select: { name: true } },
            },
          },
        },
      });
      items.forEach((it) => {
        itemsMap[it.id] = it;
      });
    }

    return NextResponse.json({ success: true, movements, itemsMap });
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
      reference,
      createdBy,
      // ── NEW ─────────────────────────────
      handedOverByName,
      handedOverByPhone,
      carrierType,
      carrierId,
      carrierName,
      carrierPhone,
      // ────────────────────────────────────
    } = await req.json();

    if (!fromBranchId || !toBranchId || !itemIds?.length) {
      return NextResponse.json(
        { success: false, error: 'fromBranchId, toBranchId, and itemIds are required' },
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

    let effectiveCreatedBy = createdBy;
    if (!effectiveCreatedBy) {
      const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      effectiveCreatedBy = admin?.id || 'system';
    }

    const items = await prisma.orderItem.findMany({
      where: { id: { in: itemIds }, currentBranchId: fromBranchId },
      include: { order: { select: { purity: true } } },
    });

    if (items.length !== itemIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some items are invalid or not in the source branch' },
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
            reference: reference || null,
            createdBy: effectiveCreatedBy,
            itemIds: data.ids,
            // ── NEW ─────────────────────────────
            handedOverByName: handedOverByName?.trim() || null,
            handedOverByPhone: handedOverByPhone?.trim() || null,
            carrierType: carrierType || 'OTHER',
            carrierId: carrierId || null,
            carrierName: carrierName.trim(),
            carrierPhone: carrierPhone?.trim() || null,
            // ────────────────────────────────────
          },
        });
        created.push(movement);
      }

      await tx.orderItem.updateMany({
        where: { id: { in: itemIds } },
        data: { currentBranchId: null },
      });

      return created;
    });

    return NextResponse.json({ success: true, movements: result });
  } catch (error) {
    console.error('Create admin movement error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}