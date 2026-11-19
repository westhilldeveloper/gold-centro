import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId'); // Optional: if provided, gets only this branch

    const orders = await prisma.order.findMany({
      where: {
        finalPrice: { not: null },
        status: { notIn: ['CANCELLED'] },
        ...(branchId ? { branchId } : {}), // Filter by branch if provided
      },
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { name: true, code: true } },
        customer: { select: { name: true, phone: true } },
        agent: { select: { name: true, phone: true } },
      },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Report API error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch report data' }, { status: 500 });
  }
}