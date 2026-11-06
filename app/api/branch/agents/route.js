// D:\gold-centro\app\api\branch\agents\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) {
      return NextResponse.json(
        { success: false, error: 'branchId required' },
        { status: 400 }
      );
    }

    const agents = await prisma.user.findMany({
      where: { branchId, role: 'AGENT' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        profilePhoto: true,        // ← NEW
        createdAt: true,
        _count: { select: { assigned: true } },
      },
    });

    return NextResponse.json({ success: true, agents });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}