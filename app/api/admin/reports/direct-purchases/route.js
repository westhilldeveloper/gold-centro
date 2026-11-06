import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const branches = await prisma.branch.findMany({ select: { id: true, name: true, code: true } });
  
  const purchases = await prisma.order.groupBy({
    by: ['branchId'],
    where: { orderType: 'BRANCH_DIRECT', status: 'COMPLETED' },
    _sum: { weight: true, finalPrice: true },
    _count: { id: true }
  });

  const report = branches.map(b => {
    const p = purchases.find(x => x.branchId === b.id) || { _sum: { weight: 0, finalPrice: 0 }, _count: { id: 0 } };
    return {
      branch: b,
      totalWeight: p._sum.weight || 0,
      totalAmount: p._sum.finalPrice || 0,
      totalOrders: p._count.id
    };
  }).filter(b => b.totalOrders > 0); // Only show branches that made purchases

  return NextResponse.json({ success: true, report });
}