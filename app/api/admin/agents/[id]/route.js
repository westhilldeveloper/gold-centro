import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// ---- UPDATE agent ----
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { name, phone, password, branchId } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Agent ID required' },
        { status: 400 }
      );
    }

    if (phone) {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { success: false, error: 'Phone number already in use' },
          { status: 400 }
        );
      }
    }

    const data = {};
    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (password !== undefined) data.password = password || null;
    if (branchId !== undefined) data.branchId = branchId || null;   // ← ADD

    const agent = await prisma.user.update({
      where: { id },
      data,
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, agent });
  } catch (error) {
    console.error('Update agent error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ---- DELETE agent ----
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Agent ID required' },
        { status: 400 }
      );
    }

    // Check if agent has active orders
    const activeOrders = await prisma.order.count({
      where: {
        agentId: id,
        status: {
          in: [
            'AGENT_ASSIGNED',
            'AGENT_ARRIVED',
            'AGENT_OFFER_SENT',
            'ADMIN_OFFER_SENT',
            'NEGOTIATING',
            'CUSTOMER_PENDING_ACCEPTANCE',
          ],
        },
      },
    });

    if (activeOrders > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete: agent has ${activeOrders} active order(s). Reassign them first.`,
        },
        { status: 400 }
      );
    }

    // Unassign agent from completed/cancelled orders (keep history but detach)
    await prisma.order.updateMany({
      where: { agentId: id },
      data: { agentId: null },
    });

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete agent error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}