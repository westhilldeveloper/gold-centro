import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) return NextResponse.json({ success: false, error: 'branchId required' }, { status: 400 });

    const [agents, staffCount, pendingDeposits, custodies, deposits] = await Promise.all([
      prisma.user.count({ where: { branchId, role: 'AGENT' } }),
      prisma.branchStaff.count({ where: { branchId } }),
      prisma.order.count({
        where: { branchId, status: 'COMPLETED', depositedToBranch: false },
      }),
      prisma.order.findMany({
        where: { branchId, status: 'COMPLETED', depositedToBranch: false },
        select: { weight: true, purity: true },
      }),
      prisma.agentDeposit.findMany({
        where: { branchId },
        select: { weight: true, purity: true },
      }),
    ]);

    // Totals
    const custodyTotals = {};
    custodies.forEach((o) => {
      custodyTotals[o.purity] = (custodyTotals[o.purity] || 0) + o.weight;
    });

    const stockTotals = {};
    deposits.forEach((d) => {
      stockTotals[d.purity] = (stockTotals[d.purity] || 0) + d.weight;
    });

    // Cash balance
    const cashTxns = await prisma.branchCashTransaction.findMany({ where: { branchId } });
    const balance =
      cashTxns.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0) -
      cashTxns.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalAgents: agents,
        totalStaff: staffCount,
        pendingDeposits,
        custodyTotals,
        stockTotals,
        cashBalance: balance,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}