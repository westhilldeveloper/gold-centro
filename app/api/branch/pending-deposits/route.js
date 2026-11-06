// D:\gold-centro\app\api\branch\pending-deposits\route.js
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

    // ⬇️ KEY CHANGE: filter by the AGENT's assigned branch, not order.branchId
    const orders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        depositedToBranch: false,
        agentId: { not: null },
        agent: { branchId }, // only agents belonging to this branch
      },
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, name: true, phone: true } },
        // ⬇️ include items so the branch can verify product-by-product
        items: {
          select: {
            id: true,
            name: true,
            count: true,
            purity: true,
            grossWeight: true,
            stoneWeight: true,
            dustWeight: true,
            netWeight: true,
            imageUrls: true,
          },
        },
      },
    });

    // Group by agent
    const grouped = {};
    orders.forEach((o) => {
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
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}