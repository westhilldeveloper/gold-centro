// D:\gold-centro\app\api\admin\fund-requests\[id]\route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const { action, adminId, reviewNote } = await req.json();

    if (!id || !action || !adminId) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const fundRequest = await prisma.fundRequest.findUnique({ where: { id } });
    if (!fundRequest) {
      return NextResponse.json({ success: false, error: 'Fund request not found' }, { status: 404 });
    }

    if (fundRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Request already reviewed' },
        { status: 400 }
      );
    }

    if (action === 'reject') {
      const updated = await prisma.fundRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedBy: adminId,
          reviewNote: reviewNote || null,
          reviewedAt: new Date(),
        },
      });

      if (global.io) {
        global.io.to(`branch_${fundRequest.branchId}`).emit('fund-request-updated', updated);
      }

      return NextResponse.json({ success: true, request: updated });
    }

    // ---- Approve: mark request + credit branch cash in one transaction ----
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update fund request
      const updated = await tx.fundRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: adminId,
          reviewNote: reviewNote || null,
          reviewedAt: new Date(),
        },
      });

      // 2. Add CREDIT to branch cash
      const cashTxn = await tx.branchCashTransaction.create({
        data: {
          branchId: fundRequest.branchId,
          type: 'CREDIT',
          amount: fundRequest.amount,
          purpose: `Fund approved: ${fundRequest.purpose}`,
          description: fundRequest.description || null,
          reference: fundRequest.id,
          createdBy: adminId,
        },
      });

      return { updated, cashTxn };
    });

    if (global.io) {
      global.io
        .to(`branch_${fundRequest.branchId}`)
        .emit('fund-request-updated', result.updated);
      global.io
        .to(`branch_${fundRequest.branchId}`)
        .emit('cash-updated', result.cashTxn);
    }

    return NextResponse.json({ success: true, request: result.updated });
  } catch (error) {
    console.error('Review fund request error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}