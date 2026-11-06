// D:\gold-centro\app\api\admin\agent-custody\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        agentId: { not: null },
        depositedToBranch: false,
      },
      select: {
        id: true,
        agentId: true,
        branchId: true,
        weight: true,
        purity: true,
        finalPrice: true,
        createdAt: true,
        agent: {
          select: {
            id: true,
            name: true,
            phone: true,
            branchId: true,
            branch: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    const grouped = {};
    pendingOrders.forEach((o) => {
      if (!o.agent) return;
      const key = o.agentId;
      if (!grouped[key]) {
        grouped[key] = {
          agent: o.agent,
          orders: [],
          totalByPurity: {},
          totalWeight: 0,
        };
      }
      grouped[key].orders.push(o);
      grouped[key].totalWeight += o.weight;
      grouped[key].totalByPurity[o.purity] =
        (grouped[key].totalByPurity[o.purity] || 0) + o.weight;
    });

    return NextResponse.json({
      success: true,
      custody: Object.values(grouped),
    });
  } catch (error) {
    console.error('Agent custody error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}