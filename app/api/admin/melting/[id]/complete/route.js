// D:\gold-centro\app\api\admin\melting\[id]\complete\route.js
import { prisma } from '../../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req, { params }) {
  try {
    const { id: batchId } = await params;
    const {
      weight,
      purity,
      imageUrl,
      handledBy,
      validatedBy,
      targetBranchId,   // ← which branch stores the bar
      notes,
    } = await req.json();

    if (!weight || !handledBy || !targetBranchId) {
      return NextResponse.json(
        { success: false, error: 'weight, handledBy, and targetBranchId are required' },
        { status: 400 }
      );
    }

    const batch = await prisma.meltingBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
    }
    if (batch.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { success: false, error: 'Batch must be IN_PROGRESS to complete' },
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
          validatedBy: validatedBy || null,
          currentBranchId: targetBranchId,     // ← stored at chosen branch
          notes: notes || null,
        },
      });

      await tx.orderItem.updateMany({
        where: { meltingBatchId: batchId, status: 'IN_MELTING' },
        data: {
          status: 'MELTED',
          meltedIntoBarId: bar.id,
          originBranchId: null,
        },
      });

      const updatedBatch = await tx.meltingBatch.update({
        where: { id: batchId },
        data: {
          status: 'COMPLETED',
          handledBy,
          completedAt: new Date(),
          totalBarWeight: bar.weight,
          branchId: targetBranchId,
          notes: notes || batch.notes,
        },
      });

      return { bar, batch: updatedBatch };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Complete batch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}