// D:\gold-centro\app\api\branch\reports\direct-purchases\route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) {
      return NextResponse.json({ success: false, error: 'branchId required' }, { status: 400 });
    }

    // 1. Fetch completed purchases
    const orders = await prisma.order.findMany({
      where: { branchId, orderType: 'BRANCH_DIRECT', status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
        staff: { select: { name: true } },
      },
    });

    // 2. Fetch Pending Agreements (needs upload)
    const pendingAgreements = await prisma.order.findMany({
      where: { branchId, orderType: 'BRANCH_DIRECT', status: 'PENDING_AGREEMENT' },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
      },
    });

    // 3. Fetch Pending Payments (needs cash transfer)
    const pendingPayments = await prisma.order.findMany({
      where: { branchId, orderType: 'BRANCH_DIRECT', status: 'PENDING_PAYMENT' },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
      },
    });

    const totalWeight = orders.reduce((s, o) => s + o.weight, 0);
    const totalAmount = orders.reduce((s, o) => s + (o.finalPrice || 0), 0);

    return NextResponse.json({
      success: true,
      orders,
      pendingAgreements,
      pendingPayments,
      stats: {
        count: orders.length,
        totalWeight,
        totalAmount,
      },
    });
  } catch (error) {
    console.error('Branch direct purchase report error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}