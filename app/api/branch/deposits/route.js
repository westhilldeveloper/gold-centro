// D:\gold-centro\app\api\branch\deposits\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) {
      return NextResponse.json(
        { success: false, error: 'branchId required' },
        { status: 400 }
      );
    }

    // Parse page / limit with sane bounds
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(
      searchParams.get('limit') || String(DEFAULT_PAGE_SIZE),
      10
    );
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const pageSize =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;

    const skip = (page - 1) * pageSize;

    const [deposits, total] = await Promise.all([
      prisma.agentDeposit.findMany({
        where: { branchId },
        orderBy: { depositedAt: 'desc' },
        skip,
        take: pageSize,
        include: { agent: { select: { name: true, phone: true } } },
      }),
      prisma.agentDeposit.count({ where: { branchId } }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const hasMore = page < totalPages;

    return NextResponse.json({
      success: true,
      deposits,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Fetch branch deposits error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}