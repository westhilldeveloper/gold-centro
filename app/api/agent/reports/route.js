import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!agentId) return NextResponse.json({ success: false, error: 'agentId required' }, { status: 400 });

    const dateFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const [orders, deposits, cash] = await Promise.all([
      prisma.order.findMany({
        where: { agentId, ...where },
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true, phone: true } } },
      }),
      prisma.agentDeposit.findMany({
        where: { agentId, ...where },
        orderBy: { depositedAt: 'desc' },
        include: { branch: { select: { name: true } } },
      }),
      prisma.agentCashTransaction.findMany({
        where: { agentId, ...where },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalGoldPurchased = orders
      .filter((o) => o.status === 'COMPLETED')
      .reduce((s, o) => s + (o.weight || 0), 0);

    const totalPaid = orders
      .filter((o) => o.status === 'COMPLETED')
      .reduce((s, o) => s + (o.finalPrice || 0), 0);

    const totalDeposited = deposits.reduce((s, d) => s + d.weight, 0);

    const totalCredits = cash.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
    const totalDebits = cash.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalGoldPurchased,
        totalPaid,
        totalDeposited,
        totalCredits,
        totalDebits,
        balance: totalCredits - totalDebits,
        ordersCount: orders.length,
      },
      orders,
      deposits,
      cash,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}