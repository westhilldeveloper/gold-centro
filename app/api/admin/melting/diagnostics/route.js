import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const byStatus = await prisma.orderItem.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const byBranchStatus = await prisma.orderItem.groupBy({
      by: ['currentBranchId', 'status'],
      _count: { _all: true },
    });

    const stuck = await prisma.orderItem.findMany({
      where: { status: { not: 'ACTIVE' } },
      select: {
        id: true,
        name: true,
        status: true,
        currentBranchId: true,
        meltingBatchId: true,
        order: { select: { id: true } },
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      statusCounts: byStatus,
      byBranchStatus,
      stuckItems: stuck,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}