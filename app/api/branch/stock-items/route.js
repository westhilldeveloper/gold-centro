// D:\gold-centro\app\api\branch\stock-items\route.js
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

    const items = await prisma.orderItem.findMany({
      where: { currentBranchId: branchId },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            purity: true,
            customer: { select: { name: true, phone: true } },
            agent: { select: { name: true } },
            createdAt: true,
          },
        },
      },
    });

    // Group by ITEM purity (fall back to order purity only if item has none)
    const totals = {};
    items.forEach((it) => {
      const purity = it.purity || it.order?.purity || 'Unknown';
      if (!totals[purity]) {
        totals[purity] = { count: 0, netWeight: 0, grossWeight: 0 };
      }
      totals[purity].count += it.count || 0;
      totals[purity].netWeight += it.netWeight || 0;
      totals[purity].grossWeight += it.grossWeight || 0;
    });

    return NextResponse.json({ success: true, items, totals });
  } catch (error) {
    console.error('Fetch stock items error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}