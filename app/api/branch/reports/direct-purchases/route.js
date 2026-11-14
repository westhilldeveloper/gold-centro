// app/api/branch/reports/direct-purchases/route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!branchId) {
      return NextResponse.json({ success: false, error: 'branchId required' }, { status: 400 });
    }

    const baseWhere = { branchId, orderType: 'BRANCH_DIRECT' };

    // Date filter only applies to COMPLETED orders (the report)
    let dateFilter = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.createdAt.lte = toDate;
      }
    }

    const [
      orders,
      pendingEstimateAgreement,
      pendingPostEstimation,
      pendingPurchaseAgreement,
      pendingPayment,
      cancelledOrders,
    ] = await Promise.all([
      // 1. Completed Orders (Date Filtered)
      prisma.order.findMany({
        where: { ...baseWhere, status: 'COMPLETED', ...dateFilter },
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
          staff: { select: { name: true } },
        },
      }),
      // 2. Pending Stages (No date filter)
      prisma.order.findMany({
        where: { ...baseWhere, status: 'PENDING_ESTIMATE_AGREEMENT' },
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true, phone: true } } },
      }),
      prisma.order.findMany({
        where: { ...baseWhere, status: 'PENDING_POST_ESTIMATION' },
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true, phone: true } } },
      }),
      prisma.order.findMany({
        where: { ...baseWhere, status: 'PENDING_PURCHASE_AGREEMENT' },
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true, phone: true } } },
      }),
      prisma.order.findMany({
        where: { ...baseWhere, status: 'PENDING_PAYMENT' },
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true, phone: true } } },
      }),
      // 3. Cancelled Orders
      prisma.order.findMany({
        where: { ...baseWhere, status: 'CANCELLED' },
        orderBy: { cancelledAt: 'desc' },
        include: { customer: { select: { name: true, phone: true } } },
      }),
    ]);

    const totalWeight = orders.reduce((s, o) => s + o.weight, 0);
    const totalAmount = orders.reduce((s, o) => s + (o.finalPrice || 0), 0);

    return NextResponse.json({
      success: true,
      orders,
      pendingEstimateAgreement,
      pendingPostEstimation,
      pendingPurchaseAgreement,
      pendingPayment,
      cancelledOrders,
      stats: {
        count: orders.length,
        totalWeight,
        totalAmount,
        cancelledCount: cancelledOrders.length,
        totalPending:
          pendingEstimateAgreement.length +
          pendingPostEstimation.length +
          pendingPurchaseAgreement.length +
          pendingPayment.length,
      },
    });
  } catch (error) {
    console.error('Branch direct purchase report error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}