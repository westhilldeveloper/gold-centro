// D:\gold-centro\app\api\admin\branches\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: [{ isHeadOffice: 'desc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { agents: true, orders: true, cashTransactions: true },
        },
      },
    });
    return NextResponse.json({ success: true, branches });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { name, code, address, city, state, pincode, phone, isHeadOffice } = await req.json();

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Ensure only one head office
    if (isHeadOffice) {
      await prisma.branch.updateMany({
        where: { isHeadOffice: true },
        data: { isHeadOffice: false },
      });
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        code,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        phone: phone || null,
        isHeadOffice: !!isHeadOffice,
      },
    });

    return NextResponse.json({ success: true, branch });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Branch code already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}