import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const movements = await prisma.stockMovement.findMany({
      where: {
        status: 'RECEIVED',
        itemIds: { isEmpty: false },
      },
    });

    let itemsFixed = 0;
    const details = [];

    for (const m of movements) {
      if (!m.toBranchId) continue;

      // Update ALL items of this movement to the destination branch.
      // No filter on currentBranchId — RECEIVED movements should always
      // have their items at the destination.
      const result = await prisma.orderItem.updateMany({
        where: { id: { in: m.itemIds } },
        data: { currentBranchId: m.toBranchId },
      });

      if (result.count > 0) {
        itemsFixed += result.count;
        details.push({
          movementId: m.id,
          itemCount: result.count,
          toBranchId: m.toBranchId,
        });
      }
    }

    return NextResponse.json({
      success: true,
      movementsChecked: movements.length,
      itemsFixed,
      details,
    });
  } catch (error) {
    console.error('Fix error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}