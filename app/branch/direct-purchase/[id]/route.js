// app/api/branch/direct-purchase/[id]/route.js
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    console.log('[GET direct-purchase] id =', id);

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        staff: { select: { name: true, phone: true } },
        branch: { select: { name: true, code: true } },
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    console.log('[GET direct-purchase] order =', order?.id, 'type =', order?.orderType);

    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('[GET direct-purchase] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}