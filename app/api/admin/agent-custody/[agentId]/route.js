// D:\gold-centro\app\api\admin\agent-custody\[agentId]\route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { agentId } = await params;

    const orders = await prisma.order.findMany({
      where: {
        agentId,
        status: 'COMPLETED',
        depositedToBranch: false,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        weight: true,
        purity: true,
        finalPrice: true,
        paymentMode: true,
        createdAt: true,
        customer: { select: { name: true, phone: true } },
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
            ratePerGram: true,
            itemPrice: true,
            imageUrls: true,
          },
        },
      },
    });

    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        phone: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, orders, agent });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}