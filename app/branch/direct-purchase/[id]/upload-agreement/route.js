// D:\gold-centro\app\api\branch\direct-purchase\[id]\upload-agreement\route.js
import { prisma } from '../../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { agreementUrl } = await req.json();

    if (!agreementUrl) {
      return NextResponse.json({ success: false, error: 'Agreement URL required' }, { status: 400 });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        purchaseAgreementUrl: agreementUrl,
        purchaseAgreementUploadedAt: new Date(),
        status: 'PENDING_PAYMENT' // <-- Moves to final payment step
      }
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Upload agreement error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}