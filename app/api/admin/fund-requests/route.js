// D:\gold-centro\app\api\admin\fund-requests\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // PENDING, APPROVED, REJECTED, or null for all

    const where = status ? { status } : {};

    const requests = await prisma.fundRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('Fetch fund requests error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}