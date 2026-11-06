import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get the specific movement
    const movement = await prisma.stockMovement.findFirst({
      where: { status: 'RECEIVED', itemIds: { isEmpty: false } },
      orderBy: { createdAt: 'desc' },
    });

    if (!movement) {
      return NextResponse.json({ success: false, error: 'No received movement with items' });
    }

    // Look up the items
    const items = await prisma.orderItem.findMany({
      where: { id: { in: movement.itemIds } },
      select: {
        id: true,
        name: true,
        netWeight: true,
        currentBranchId: true,
      },
    });

    return NextResponse.json({
      success: true,
      movement: {
        id: movement.id,
        status: movement.status,
        fromBranchId: movement.fromBranchId,
        toBranchId: movement.toBranchId,
        itemIds: movement.itemIds,
      },
      items,
      diagnosis: items.map((it) => ({
        id: it.id,
        name: it.name,
        currentBranchId: it.currentBranchId,
        expected: movement.toBranchId,
        correct: it.currentBranchId === movement.toBranchId,
      })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}