// D:\gold-centro\app\api\admin\branch-staff\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { hashPassword } from '../../../../lib/server/password';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const where = branchId ? { branchId } : {};

    const staff = await prisma.branchStaff.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        branchId: true,
        createdAt: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, staff });
  } catch (error) {
    console.error('Fetch branch staff error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch branch staff' },
      { status: 500 }
    );
  }
}

const ALLOWED_ROLES = ['MANAGER', 'CASHIER', 'VAULT_KEEPER', 'TESTER', 'STAFF'];

export async function POST(req) {
  try {
    const { name, phone, password, role, branchId } = await req.json();

    if (!name || !phone || !password || !branchId) {
      return NextResponse.json(
        { success: false, error: 'Name, phone, password, and branch are required' },
        { status: 400 }
      );
    }

    if (role && !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    const existing = await prisma.branchStaff.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Phone number already registered for branch staff' },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return NextResponse.json({ success: false, error: 'Branch not found' }, { status: 404 });
    }

    // Hash the password before it ever touches the DB.
    let hashed;
    try {
      hashed = await hashPassword(password);
    } catch (e) {
      if (e.code === 'WEAK_PASSWORD') {
        return NextResponse.json({ success: false, error: e.message }, { status: 400 });
      }
      throw e;
    }

    const staff = await prisma.branchStaff.create({
      data: {
        name,
        phone,
        password: hashed,          // ← bcrypt hash, not plaintext
        role: role || 'STAFF',
        branchId,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    // Strip password from the response
    const { password: _, ...safeStaff } = staff;
    return NextResponse.json({ success: true, staff: safeStaff });
  } catch (error) {
    console.error('Create branch staff error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create branch staff' },
      { status: 500 }
    );
  }
}