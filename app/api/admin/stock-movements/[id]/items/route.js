// D:\gold-centro\app\api\admin\stock-movements\[id]\items\route.js
import { prisma } from '../../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const movement = await prisma.stockMovement.findUnique({
      where: { id },
      select: { itemIds: true },
    });

    if (!movement) {
      return NextResponse.json({ success: false, error: 'Movement not found' }, { status: 404 });
    }

    if (!movement.itemIds || movement.itemIds.length === 0) {
      return NextResponse.json({ success: true, items: [] });
    }

    const items = await prisma.orderItem.findMany({
      where: { id: { in: movement.itemIds } },
      include: {
        order: {
          select: {
            id: true,
            purity: true,
            customer: { select: { name: true } },
            agent: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('Fetch movement items error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}