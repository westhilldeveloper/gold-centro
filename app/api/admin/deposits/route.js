import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');

    const where = branchId ? { branchId } : {};

    const deposits = await prisma.agentDeposit.findMany({
      where,
      orderBy: { depositedAt: 'desc' },
      include: {
        agent: { select: { id: true, name: true, phone: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, deposits });
  } catch (error) {
    console.error('Fetch deposits error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}