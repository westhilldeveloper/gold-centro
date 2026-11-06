// D:\gold-centro\app\api\agent\deposits\[id]\route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const deposit = await prisma.agentDeposit.findUnique({
      where: { id },
      include: {
        branch: { select: { name: true, code: true, phone: true } },
      },
    });

    if (!deposit) {
      return NextResponse.json(
        { success: false, error: 'Deposit not found' },
        { status: 404 }
      );
    }

    // Fetch the full details of every order in this deposit
    const orders = await prisma.order.findMany({
      where: { id: { in: deposit.orderIds } },
      include: {
        customer: { select: { name: true, phone: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, deposit, orders });
  } catch (error) {
    console.error('Agent deposit detail error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}