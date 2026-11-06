// D:\gold-centro\app\api\orders\pending-approval\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ['AGENT_OFFER_SENT', 'ADMIN_OFFER_SENT', 'NEGOTIATING'],
        },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        customer: { select: { name: true, phone: true } },
        agent: { select: { name: true, phone: true } },
        items: true, // ← include item list with image URLs
      },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Fetch pending approvals error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}