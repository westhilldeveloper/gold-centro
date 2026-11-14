// app/api/branch/direct-purchase/[id]/cancel/route.js
import { prisma } from '../../../../../../lib/prisma';
import { NextResponse } from 'next/server';

const PENDING_STATES = [
  'PENDING_ESTIMATE_AGREEMENT',
  'PENDING_POST_ESTIMATION',
  'PENDING_PURCHASE_AGREEMENT',
  'PENDING_PAYMENT',
];

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { reason, staffId } = await req.json();

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Cancel reason is required (min 3 characters)' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    if (order.orderType !== 'BRANCH_DIRECT') {
      return NextResponse.json({ success: false, error: 'Not a branch direct order' }, { status: 400 });
    }
    if (order.status === 'COMPLETED') {
      return NextResponse.json({ success: false, error: 'Cannot cancel a completed order' }, { status: 400 });
    }
    if (order.status === 'CANCELLED') {
      return NextResponse.json({ success: false, error: 'Order already cancelled' }, { status: 400 });
    }
    if (!PENDING_STATES.includes(order.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot cancel order in status: ${order.status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: staffId || null,
        cancelReason: reason.trim(),
      },
      include: {
        customer: { select: { name: true, phone: true } },
        staff: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('Cancel direct purchase error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}