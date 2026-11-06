import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            aadhaarNumber: true,   // ← needed for receipt
          },
        },
        agent: {
          select: { id: true, name: true, phone: true },
        },
        branch: {
          select: {
            id: true, name: true, code: true,
            address: true, city: true, state: true,
            pincode: true, phone: true,
          },
        },
        items: true,               // ← array of items
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Receipt fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}