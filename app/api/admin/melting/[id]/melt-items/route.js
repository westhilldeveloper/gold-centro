// D:\gold-centro\app\api\admin\melting\[id]\melt-items\route.js
import { prisma } from '../../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req, { params }) {
  try {
    const { id: batchId } = await params;
    const { itemIds, weight, purity, imageUrl, handledBy, notes } = await req.json();

    if (!itemIds?.length || !weight || !handledBy) {
      return NextResponse.json(
        { success: false, error: 'itemIds, weight, and handledBy are required' },
        { status: 400 }
      );
    }

    const batch = await prisma.meltingBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
    }
    if (batch.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { success: false, error: 'Batch must be IN_PROGRESS to melt items' },
        { status: 400 }
      );
    }

    const items = await prisma.orderItem.findMany({
      where: {
        id: { in: itemIds },
        meltingBatchId: batchId,
        status: 'IN_MELTING',
      },
    });

    if (items.length !== itemIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some items are invalid or already melted' },
        { status: 400 }
      );
    }

    const barCount = await prisma.goldBar.count();
    const year = new Date().getFullYear();
    const barCode = `BAR-${year}-${String(barCount + 1).padStart(4, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      const bar = await tx.goldBar.create({
        data: {
          barCode,
          batchId,
          imageUrl: imageUrl || null,
          purity: purity || batch.purity,
          weight: parseFloat(weight),
          handledBy,
          currentBranchId: batch.branchId,
          notes: notes || null,
        },
      });

      await tx.orderItem.updateMany({
        where: { id: { in: itemIds } },
        data: {
          status: 'MELTED',
          meltedIntoBarId: bar.id,
        },
      });

      const allBars = await tx.goldBar.findMany({ where: { batchId } });
      const totalBarWeight = allBars.reduce((s, b) => s + b.weight, 0);

      const remaining = await tx.orderItem.count({
        where: { meltingBatchId: batchId, status: 'IN_MELTING' },
      });

      const updatedBatch = await tx.meltingBatch.update({
        where: { id: batchId },
        data: {
          totalBarWeight,
          ...(remaining === 0
            ? { status: 'COMPLETED', handledBy, completedAt: new Date() }
            : {}),
        },
      });

      return { bar, batch: updatedBatch, remainingItems: remaining };
    });

    return NextResponse.json({
      success: true,
      bar: result.bar,
      batch: result.batch,
      remainingItems: result.remainingItems,
      batchCompleted: result.remainingItems === 0,
    });
  } catch (error) {
    console.error('Melt items error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}