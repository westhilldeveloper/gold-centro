import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    if (!agentId) return NextResponse.json({ success: false, error: 'agentId required' }, { status: 400 });

    const txns = await prisma.agentCashTransaction.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const credits = txns.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
    const debits = txns.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);

    return NextResponse.json({
      success: true,
      transactions: txns,
      balance: credits - debits,
      credits,
      debits,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}