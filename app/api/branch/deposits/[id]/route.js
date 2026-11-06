// D:\gold-centro\app\api\branch\deposits\[id]\route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const deposit = await prisma.agentDeposit.findUnique({
      where: { id },
      include: {
        agent: { select: { id: true, name: true, phone: true } },
        branch: {
          select: { id: true, name: true, code: true, phone: true },
        },
      },
    });

    if (!deposit) {
      return NextResponse.json(
        { success: false, error: 'Deposit not found' },
        { status: 404 }
      );
    }

    // Orders referenced by this deposit + their items + customer
    const orders = await prisma.order.findMany({
      where: { id: { in: deposit.orderIds } },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
        items: true,
      },
    });

    // Resolve `receivedBy` — could be a User (agent) or BranchStaff
    let receivedByUser = null;
    if (deposit.receivedBy) {
      receivedByUser = await prisma.user.findUnique({
        where: { id: deposit.receivedBy },
        select: { id: true, name: true, phone: true },
      });

      if (!receivedByUser) {
        try {
          receivedByUser = await prisma.branchStaff.findUnique({
            where: { id: deposit.receivedBy },
            select: { id: true, name: true, phone: true },
          });
        } catch {
          // ignore if model missing in your schema
        }
      }
    }

    return NextResponse.json({
      success: true,
      deposit,
      orders,
      receivedByUser,
    });
  } catch (error) {
    console.error('Fetch deposit detail error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}