// D:\gold-centro\app\api\branch\orders\route.js
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

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { branchId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          customer: { select: { name: true, phone: true } },
          agent: { select: { name: true, phone: true } },
          staff: { select: { name: true, phone: true } },
          items: {
            select: {
              id: true,
              name: true,
              count: true,
              purity: true,
              imageUrls: true,
              grossWeight: true,
              stoneWeight: true,
              dustWeight: true,
              netWeight: true,
            },
          },
        },
      }),
      prisma.order.count({ where: { branchId } }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Branch orders error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}