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

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Order
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

      // 2. Move items into branch stock
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