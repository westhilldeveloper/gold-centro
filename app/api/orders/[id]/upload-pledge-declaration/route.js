import { prisma } from '../../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req, { params }) {
  try {
    const { id } = params;
    const { url, uploadedBy } = await req.json();
    if (!url || !uploadedBy) {
      return NextResponse.json(
        { success: false, error: 'url and uploadedBy required' },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        pledgeDeclarationUrl: url,
        pledgeDeclarationUploadedAt: new Date(),
        pledgeDeclarationUploadedBy: uploadedBy,
      },
      include: { customer: true, items: true, agent: true },
    });

    return NextResponse.json({ success: true, order });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}