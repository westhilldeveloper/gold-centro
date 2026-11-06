import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) return NextResponse.json({ success: false, error: 'branchId required' }, { status: 400 });

    const expenses = await prisma.branchExpense.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, expenses });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { branchId, category, amount, description, createdBy } = await req.json();
    if (!branchId || !category || !amount || !createdBy) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    const expense = await prisma.branchExpense.create({
      data: {
        branchId, category,
        amount: parseFloat(amount),
        description: description || null,
        createdBy,
      },
    });

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}