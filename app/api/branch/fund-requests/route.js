// D:\gold-centro\app\api\branch\fund-requests\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

// ---- GET: List fund requests for a branch ----
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) {
      return NextResponse.json({ success: false, error: 'branchId required' }, { status: 400 });
    }

    const requests = await prisma.fundRequest.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('Fetch fund requests error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ---- POST: Create a new fund request ----
export async function POST(req) {
  try {
    const { branchId, amount, purpose, description, requestedBy } = await req.json();

    if (!branchId || !amount || !purpose || !requestedBy) {
      return NextResponse.json(
        { success: false, error: 'branchId, amount, purpose, and requestedBy are required' },
        { status: 400 }
      );
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be positive' }, { status: 400 });
    }

    const request = await prisma.fundRequest.create({
      data: {
        branchId,
        amount: parseFloat(amount),
        purpose,
        description: description || null,
        requestedBy,
        status: 'PENDING',
      },
    });

    // Notify admin via socket (if available)
    if (global.io) {
      global.io.to('admin').emit('new-fund-request', request);
    }

    return NextResponse.json({ success: true, request });
  } catch (error) {
    console.error('Create fund request error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}