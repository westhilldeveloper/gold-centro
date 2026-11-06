// D:\gold-centro\app\api\branch\agent-cash-requests\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const status = searchParams.get('status');
    if (!branchId) {
      return NextResponse.json({ success: false, error: 'branchId required' }, { status: 400 });
    }

    const where = { branchId };
    if (status && status !== 'ALL') where.status = status;

    const requests = await prisma.agentCashRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('Fetch branch agent-cash-requests error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}