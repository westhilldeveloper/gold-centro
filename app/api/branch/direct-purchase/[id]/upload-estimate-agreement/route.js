// D:\gold-centro\app\api\branch\direct-purchase\[id]\upload-estimate-agreement\route.js
import { prisma } from '../../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { agreementUrl } = await req.json();

    const order = await prisma.order.update({
      where: { id },
      data: {
        estimateAgreementUrl: agreementUrl,
        status: 'PENDING_POST_ESTIMATION' // Move to the next phase
      }
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}