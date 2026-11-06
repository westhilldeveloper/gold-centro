// D:\gold-centro\app\api\admin\stock-movements\[id]\route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { status, receivedBy, receivedByName } = await req.json();

    if (!['RECEIVED', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    const movement = await prisma.stockMovement.findUnique({ where: { id } });
    if (!movement) {
      return NextResponse.json(
        { success: false, error: 'Movement not found' },
        { status: 404 }
      );
    }
    if (!['IN_TRANSIT', 'PENDING'].includes(movement.status)) {
      return NextResponse.json(
        { success: false, error: 'Movement already completed' },
        { status: 400 }
      );
    }

    // Require a receiver name when marking received
    if (status === 'RECEIVED' && !receivedByName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Receiver name is required' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update movement status + receiver info
      const updated = await tx.stockMovement.update({
        where: { id },
        data: {
          status,
          receivedBy: status === 'RECEIVED' ? receivedBy || null : null,
          receivedByName:
            status === 'RECEIVED' ? receivedByName.trim() : null,
          receivedAt: status === 'RECEIVED' ? new Date() : null,
        },
      });

      // 2. Move items to destination (or back to source if cancelled)
      if (status === 'RECEIVED' && movement.itemIds?.length > 0) {
        const res = await tx.orderItem.updateMany({
          where: { id: { in: movement.itemIds } },
          data: { currentBranchId: movement.toBranchId },
        });
        console.log(
          `[ADMIN MOVEMENT ${id}] Moved ${res.count} items to ${movement.toBranchId}`
        );
      } else if (status === 'CANCELLED' && movement.itemIds?.length > 0) {
        const res = await tx.orderItem.updateMany({
          where: { id: { in: movement.itemIds } },
          data: { currentBranchId: movement.fromBranchId },
        });
        console.log(
          `[ADMIN MOVEMENT ${id}] Returned ${res.count} items to ${movement.fromBranchId}`
        );
      }

      return updated;
    });

    return NextResponse.json({ success: true, movement: result });
  } catch (error) {
    console.error('Update admin movement error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}