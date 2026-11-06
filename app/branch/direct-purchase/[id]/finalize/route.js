// D:\gold-centro\app\api\branch\direct-purchase\[id]\finalize\route.js
import { prisma } from '../../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { agreementUrl } = await req.json();

    if (!agreementUrl) {
      return NextResponse.json({ success: false, error: 'Agreement URL required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.orderType !== 'BRANCH_DIRECT') {
      return NextResponse.json({ success: false, error: 'Invalid order' }, { status: 404 });
    }
    if (order.status !== 'PENDING_AGREEMENT') {
      return NextResponse.json({ success: false, error: 'Order already finalized' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Handle Cash Deduction (If CASH)
      if (order.paymentMode === 'CASH') {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'branch_cash_' + order.branchId}))`;
        
        const [creditAgg, debitAgg] = await Promise.all([
          tx.branchCashTransaction.aggregate({ where: { branchId: order.branchId, type: 'CREDIT' }, _sum: { amount: true } }),
          tx.branchCashTransaction.aggregate({ where: { branchId: order.branchId, type: 'DEBIT' }, _sum: { amount: true } }),
        ]);
        const balance = (creditAgg._sum.amount || 0) - (debitAgg._sum.amount || 0);
        
        if (order.finalPrice > balance) {
          throw new Error(`Insufficient branch cash. Available: ₹${balance.toFixed(2)}, Needed: ₹${order.finalPrice.toFixed(2)}`);
        }

        await tx.branchCashTransaction.create({
          data: {
            branchId: order.branchId,
            type: 'DEBIT',
            amount: order.finalPrice,
            purpose: `Direct Gold Purchase (Order #${order.id.slice(-6)})`,
            description: `Paid to customer`,
            reference: order.id,
            createdBy: order.staffId,
          }
        });
      }

      // 2. Update Order
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          purchaseAgreementUrl: agreementUrl,
          purchaseAgreementUploadedAt: new Date(),
          depositedToBranch: true,
          depositedAt: new Date(),
        }
      });

      // 3. Move items into branch stock
      await tx.orderItem.updateMany({
        where: { orderId: id },
        data: {
          status: 'ACTIVE',
          currentBranchId: order.branchId,
        }
      });

      return updatedOrder;
    });

    return NextResponse.json({ success: true, order: result });
  } catch (error) {
    console.error('Finalize direct purchase error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}