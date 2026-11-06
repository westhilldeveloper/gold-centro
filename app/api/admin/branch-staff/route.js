import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const where = branchId ? { branchId } : {};

    const staff = await prisma.branchStaff.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, staff });
  } catch (error) {
    console.error('Fetch branch staff error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { name, phone, password, role, branchId } = await req.json();

    if (!name || !phone || !password || !branchId) {
      return NextResponse.json(
        { success: false, error: 'Name, phone, password, and branch are required' },
        { status: 400 }
      );
    }

    // Check phone uniqueness
    const existing = await prisma.branchStaff.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Phone number already registered for branch staff' },
        { status: 400 }
      );
    }

    // Verify branch exists
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return NextResponse.json(
        { success: false, error: 'Branch not found' },
        { status: 404 }
      );
    }

    const staff = await prisma.branchStaff.create({
      data: {
        name,
        phone,
        password, // NOTE: hash in production
        role: role || 'STAFF',
        branchId,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, staff });
  } catch (error) {
    console.error('Create branch staff error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}