// D:\gold-centro\app\api\admin\branches\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // We run 3 queries in parallel for maximum speed
    const [branches, sellByBranch, grandTotalSell] = await Promise.all([
      // 1. Get base branch info
      prisma.branch.findMany({
        orderBy: [{ isHeadOffice: 'desc' }, { createdAt: 'asc' }],
        include: {
          _count: { select: { agents: true, orders: true, cashTransactions: true } },
        },
      }),

      // 2. Get sales grouped by branch
      prisma.order.groupBy({
        by: ['branchId'],
        where: {
          branchId: { not: null },
          finalPrice: { not: null },          // Price was agreed
          status: { notIn: ['CANCELLED'] },   // Not cancelled
        },
        _count: { _all: true },
        _sum: { finalPrice: true, weight: true },
      }),

      // 3. Get the exact grand total across ALL branches
      prisma.order.aggregate({
        where: {
          branchId: { not: null },
          finalPrice: { not: null },
          status: { notIn: ['CANCELLED'] },
        },
        _count: { _all: true },
        _sum: { finalPrice: true, weight: true },
      }),
    ]);

    // Map the grouped sales into a quick lookup dictionary
    const salesMap = Object.fromEntries(
      sellByBranch.map((s) => [
        s.branchId,
        {
          orders: s._count._all,
          amount: s._sum.finalPrice || 0,
          weight: s._sum.weight || 0,
        },
      ])
    );

    // Combine branch data with their specific sales
    const enrichedBranches = branches.map((b) => ({
      ...b,
      sell: salesMap[b.id] || { orders: 0, amount: 0, weight: 0 },
    }));

    // Format the grand total
    const grandTotal = {
      orders: grandTotalSell._count._all,
      amount: grandTotalSell._sum.finalPrice || 0,
      weight: grandTotalSell._sum.weight || 0,
    };

    // Return everything cleanly structured
    return NextResponse.json({
      success: true,
      grandTotal,
      branches: enrichedBranches,
    });

  } catch (error) {
    console.error('Fetch branches error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch branches' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { name, code, address, city, state, pincode, phone, isHeadOffice } = await req.json();

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Ensure only one head office
    if (isHeadOffice) {
      await prisma.branch.updateMany({
        where: { isHeadOffice: true },
        data: { isHeadOffice: false },
      });
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        code,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        phone: phone || null,
        isHeadOffice: !!isHeadOffice,
      },
    });

    return NextResponse.json({ success: true, branch });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Branch code already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}