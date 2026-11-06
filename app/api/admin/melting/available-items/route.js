// D:\gold-centro\app\api\admin\melting\available-items\route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // ---- 1. Find the head office / main branch ----
    const mainBranch = await prisma.branch.findFirst({
      where: { isHeadOffice: true },
      select: { id: true, name: true, code: true },
    });

    if (!mainBranch) {
      return NextResponse.json({
        success: true,
        items: [],
        mainBranch: null,
        warning: 'No head office branch configured',
      });
    }

    // ---- 2. Only items currently at the main branch ----
    const items = await prisma.orderItem.findMany({
      where: {
        status: 'ACTIVE',
        currentBranchId: mainBranch.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            purity: true,
            paymentMode: true,
            customer: { select: { name: true } },
            agent: { select: { name: true } },
          },
        },
      },
    });

    // Attach branch info for the client
    const enriched = items.map((it) => ({
      ...it,
      currentBranch: mainBranch,
    }));

    return NextResponse.json({
      success: true,
      items: enriched,
      mainBranch,
    });
  } catch (error) {
    console.error('Available items error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}