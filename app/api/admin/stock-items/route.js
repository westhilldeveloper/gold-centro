// D:\gold-centro\app\api\admin\stock-items\route.js
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
      // `include` returns all OrderItem scalars (imageUrls, purity,
      // grossWeight, netWeight, count, etc.) plus the order relation.
      include: {
        order: {
          select: {
            id: true,
            purity: true,
            createdAt: true,
            customer: { select: { name: true, phone: true } },
            agent: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('Admin fetch stock items error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}