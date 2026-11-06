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
        customer: { select: { id: true, name: true, phone: true } },
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

// ---------- POST: assign an order to an agent ----------
export async function POST(req) {
  try {
    const { orderId, agentId } = await req.json();

    if (!orderId || !agentId) {
      return NextResponse.json(
        { success: false, error: 'orderId and agentId are required' },
        { status: 400 }
      );
    }

    // Update the order and pull in the relations the agent card needs
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        agentId,
        status: 'AGENT_ASSIGNED',
        qrGeneratedAt: new Date(),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        agent:    { select: { id: true, name: true, phone: true } },
        items:    true,
      },
    });

    // 🔥 Emit to that specific agent's room
    global.io?.to('admin').emit('order-assigned', order);
// The specific agent gets a live "new assignment" push
global.io?.to(`user:${agentId}`).emit('new-assignment', order);

    return NextResponse.json({ success: true, order });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}