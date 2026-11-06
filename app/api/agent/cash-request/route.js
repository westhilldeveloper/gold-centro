import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

// GET: list all cash requests for this agent
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    if (!agentId) {
      return NextResponse.json({ success: false, error: 'agentId required' }, { status: 400 });
    }

    const requests = await prisma.agentCashRequest.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('Fetch agent cash requests error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: create a new cash request
export async function POST(req) {
  try {
    const { agentId, amount, purpose, description } = await req.json();

    if (!agentId || !amount || !purpose) {
      return NextResponse.json(
        { success: false, error: 'agentId, amount, and purpose are required' },
        { status: 400 }
      );
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be positive' }, { status: 400 });
    }

    // Get the agent to find their branch
    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: { id: true, branchId: true, name: true, role: true },
    });

    if (!agent) {
      return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });
    }
    if (agent.role !== 'AGENT') {
      return NextResponse.json({ success: false, error: 'Only agents can raise cash requests' }, { status: 403 });
    }
    if (!agent.branchId) {
      return NextResponse.json(
        { success: false, error: 'You are not assigned to any branch. Contact admin.' },
        { status: 400 }
      );
    }

    const request = await prisma.agentCashRequest.create({
      data: {
        agentId,
        branchId: agent.branchId,
        amount: parseFloat(amount),
        purpose,
        description: description || null,
        requestedBy: agentId,
        status: 'PENDING',
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    // Notify branch staff via socket
    if (global.io) {
      global.io.to(`branch_${agent.branchId}`).emit('new-agent-cash-request', request);
    }

    return NextResponse.json({ success: true, request });
  } catch (error) {
    console.error('Create agent cash request error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}