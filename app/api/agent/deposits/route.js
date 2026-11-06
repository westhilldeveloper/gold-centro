// D:\gold-centro\app\api\agent\deposits\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'agentId required' },
        { status: 400 }
      );
    }

    // ---- Pagination params ----
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(
      searchParams.get('limit') || String(DEFAULT_PAGE_SIZE),
      10
    );
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;

    // ---- Filters ----
    const search = (searchParams.get('search') || '').trim();
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    const where = { agentId };
    if (search) {
      // Search by deposit id, branch name, branch code, or notes
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { branch: { name: { contains: search, mode: 'insensitive' } } },
        { branch: { code: { contains: search, mode: 'insensitive' } } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (from || to) {
      where.depositedAt = {};
      if (from) where.depositedAt.gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        where.depositedAt.lte = d;
      }
    }

    // ---- Parallel fetch ----
    const [deposits, filteredCount, custodyOrders, allDeposits] =
      await Promise.all([
        // Paginated, filtered deposits
        prisma.agentDeposit.findMany({
          where,
          orderBy: { depositedAt: 'desc' },
          skip,
          take: limit,
          include: { branch: { select: { name: true, code: true } } },
        }),

        // Total deposits matching the filter (for pagination math)
        prisma.agentDeposit.count({ where }),

        // Custody orders — always full list
        prisma.order.findMany({
          where: {
            agentId,
            status: 'COMPLETED',
            depositedToBranch: false,
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            weight: true,
            purity: true,
            finalPrice: true,
            createdAt: true,
          },
        }),

        // ALL deposits (lightweight) — used only for the summary totals
        // Ignores search/date filters so the stats never lie
        prisma.agentDeposit.findMany({
          where: { agentId },
          select: { weight: true, purity: true },
        }),
      ]);

    // ---- Compute summaries from the FULL dataset ----
    const depositedTotal = allDeposits.reduce(
      (s, d) => s + (d.weight || 0),
      0
    );
    const depositedByPurity = {};
    allDeposits.forEach((d) => {
      depositedByPurity[d.purity] =
        (depositedByPurity[d.purity] || 0) + (d.weight || 0);
    });

    const custodyTotal = custodyOrders.reduce(
      (s, o) => s + (o.weight || 0),
      0
    );
    const custodyByPurity = {};
    custodyOrders.forEach((o) => {
      custodyByPurity[o.purity] =
        (custodyByPurity[o.purity] || 0) + (o.weight || 0);
    });

    const totalPages = Math.max(1, Math.ceil(filteredCount / limit));

    return NextResponse.json({
      success: true,
      deposits,
      custodyOrders,
      // Totals computed over ALL deposits (not just current page)
      totals: {
        depositedTotal,
        depositedByPurity,
        depositCount: allDeposits.length,
        custodyTotal,
        custodyByPurity,
        custodyCount: custodyOrders.length,
      },
      pagination: {
        page,
        limit,
        total: filteredCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Agent deposits error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}