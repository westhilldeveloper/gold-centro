import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// ---------- GET: fetch orders assigned to an agent ----------
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'agentId is required' },
        { status: 400 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { agentId },
      include: {
        customer: { select: { id: true, name: true, phone: true, aadhaarNumber: true, } },
        agent:    { select: { id: true, name: true, phone: true } },
        items:    true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, orders });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}