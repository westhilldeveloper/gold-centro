// app/api/admin/agent-custody/[agentId]/route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const { agentId } = await params;

    // 1. Custody orders (bought, not yet deposited)
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

    // 2. ✅ NEW: Carrier items (physically being transferred)
    const carrierItems = await prisma.orderItem.findMany({
      where: {
        currentAgentId: agentId,
        currentBranchId: null,
      },
      orderBy: { createdAt: 'desc' },
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
        createdAt: true,
        order: {
          select: {
            id: true,
            purity: true,
            customer: { select: { name: true } },
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

    return NextResponse.json({
      success: true,
      orders,
      carrierItems, // ✅ NEW
      agent,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}