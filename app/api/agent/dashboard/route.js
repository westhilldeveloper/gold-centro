// D:\gold-centro\app\api\agent\dashboard\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    if (!agentId) return NextResponse.json({ success: false, error: 'agentId required' }, { status: 400 });

    const [orders, deposits, cashTxns] = await Promise.all([
      prisma.order.findMany({
        where: { agentId },
        select: { id: true, status: true, weight: true, purity: true, finalPrice: true, depositedToBranch: true, createdAt: true },
      }),
      prisma.agentDeposit.findMany({
        where: { agentId },
        select: { weight: true, purity: true, depositedAt: true },
      }),
      prisma.agentCashTransaction.findMany({
        where: { agentId },
        select: { type: true, amount: true },
      }),
    ]);

    // Custody = completed orders not yet deposited
    const custodyTotals = {};
    orders.forEach((o) => {
      if (o.status === 'COMPLETED' && !o.depositedToBranch) {
        custodyTotals[o.purity] = (custodyTotals[o.purity] || 0) + o.weight;
      }
    });

    const depositsTotals = {};
    deposits.forEach((d) => {
      depositsTotals[d.purity] = (depositsTotals[d.purity] || 0) + d.weight;
    });

    const credits = cashTxns.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
    const debits = cashTxns.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);

    // ---- Order Counts ----
    // 1. Pending Action: Requires the agent to do something right now
    const pendingOrders = orders.filter((o) =>
      ['AGENT_ASSIGNED', 'AGENT_ARRIVED'].includes(o.status)
    ).length;

    // 2. Waiting: Agent has done their part, waiting on Admin or Customer
    const waitingOrders = orders.filter((o) =>
      ['AGENT_OFFER_SENT', 'ADMIN_OFFER_SENT', 'NEGOTIATING', 'CUSTOMER_PENDING_ACCEPTANCE'].includes(o.status)
    ).length;

    // 3. Active: Total incomplete orders
    const activeOrders = pendingOrders + waitingOrders;

    const completedToday = orders.filter((o) => {
      if (o.status !== 'COMPLETED') return false;
      const today = new Date().toDateString();
      return new Date(o.createdAt).toDateString() === today;
    }).length;

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders: orders.length,
        activeOrders,
        pendingOrders, // <- Added
        waitingOrders, // <- Added
        completedToday,
        custodyTotals,
        depositsTotals,
        cashBalance: credits - debits,
        cashCredits: credits,
        cashDebits: debits,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}