// D:\gold-centro\app\api\orders\pending\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch orders that are verified by customer but not yet assigned to an agent
    const orders = await prisma.order.findMany({
      where: {
        status: 'OTP_VERIFIED', 
      },
      orderBy: { createdAt: 'asc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Fetch pending orders error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}