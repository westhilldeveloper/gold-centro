import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    let releasedFromMelting = 0;
    let repairedBranches = 0;

    // ================================
    // 1. Release items stuck in IN_MELTING
    // ================================
    const stuckItems = await prisma.orderItem.findMany({
      where: { status: 'IN_MELTING' },
      include: {
        order: { select: { id: true, branchId: true, agentId: true } },
      },
    });

    for (const item of stuckItems) {
      // Try to determine the correct branch:
      //   1. order.branchId if set
      //   2. agent's branch
      let branchId = item.order?.branchId;

      if (!branchId && item.order?.agentId) {
        const agent = await prisma.user.findUnique({
          where: { id: item.order.agentId },
          select: { branchId: true },
        });
        branchId = agent?.branchId || null;
      }

      // Fallback: use melting batch's fromBranchIds[0]
      if (!branchId && item.meltingBatchId) {
        const batch = await prisma.meltingBatch.findUnique({
          where: { id: item.meltingBatchId },
          select: { fromBranchIds: true },
        });
        branchId = batch?.fromBranchIds?.[0] || null;
      }

      // Update item
      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          status: 'ACTIVE',
          meltingBatchId: null,
          currentBranchId: branchId,
        },
      });
      releasedFromMelting++;
    }

    // ================================
    // 2. Repair ACTIVE items with null branch
    // ================================
    const orphanedItems = await prisma.orderItem.findMany({
      where: {
        status: 'ACTIVE',
        currentBranchId: null,
      },
      include: {
        order: { select: { id: true, branchId: true, agentId: true } },
      },
    });

    for (const item of orphanedItems) {
      // Same resolution order as above
      let branchId = item.order?.branchId;

      if (!branchId && item.order?.agentId) {
        const agent = await prisma.user.findUnique({
          where: { id: item.order.agentId },
          select: { branchId: true },
        });
        branchId = agent?.branchId || null;
      }

      if (branchId) {
        await prisma.orderItem.update({
          where: { id: item.id },
          data: { currentBranchId: branchId },
        });
        repairedBranches++;
      }
    }

    // ================================
    // 3. Return summary
    // ================================
    return NextResponse.json({
      success: true,
      releasedFromMelting,
      repairedBranches,
      totalFixed: releasedFromMelting + repairedBranches,
    });
  } catch (error) {
    console.error('Repair error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}