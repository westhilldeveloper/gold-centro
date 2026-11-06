import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) return NextResponse.json({ success: false, error: 'branchId required' }, { status: 400 });

    const staff = await prisma.branchStaff.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, staff });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { branchId, name, phone, password, role } = await req.json();
    if (!branchId || !name || !phone || !password) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    const existing = await prisma.branchStaff.findUnique({ where: { phone } });
    if (existing) return NextResponse.json({ success: false, error: 'Phone already registered' }, { status: 400 });

    const staff = await prisma.branchStaff.create({
      data: { branchId, name, phone, password, role: role || 'STAFF' },
    });

    return NextResponse.json({ success: true, staff });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}