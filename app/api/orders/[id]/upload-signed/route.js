import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const { url, uploadedBy } = await req.json();

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        signedDocumentUrl: url,
        signedDocumentUploadedAt: new Date(),
        signedDocumentUploadedBy: uploadedBy || order.agentId,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        agent:    { select: { id: true, name: true, phone: true } },
        items:    true,
      },
    });

    // Notify customer + admin
    if (globalThis.io) {
      globalThis.io.to(`customer:${updated.customerId}`).emit('order-updated', updated);
      if (updated.agentId) {
        globalThis.io.to(`agent:${updated.agentId}`).emit('order-updated', updated);
      }
      globalThis.io.to('admin').emit('offer-updated', updated);
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('Upload signed error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}