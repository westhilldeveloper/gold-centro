// D:\gold-centro\app\api\branch\direct-purchase\[id]\route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        staff: { select: { name: true, phone: true } },
        branch: { select: { name: true, code: true } },
        items: true,
      },
    });

    if (!order || order.orderType !== 'BRANCH_DIRECT') {
      return NextResponse.json(
        { success: false, error: 'Direct purchase not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Fetch direct purchase error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}