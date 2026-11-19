import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/server/password';

export const runtime = 'nodejs';

const ALLOWED_ROLES = ['MANAGER', 'CASHIER', 'VAULT_KEEPER', 'TESTER', 'STAFF'];

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { name, phone, password, role, branchId, isActive } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Staff ID required' }, { status: 400 });
    }

    if (role && !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }

    if (phone) {
      const existing = await prisma.branchStaff.findUnique({ where: { phone } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ success: false, error: 'Phone number already in use' }, { status: 400 });
      }
    }

    const data = {};
    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (role) data.role = role;
    if (branchId) data.branchId = branchId;
    if (isActive !== undefined) data.isActive = isActive;

    // Hash only when a new non-empty password is supplied.
    // Blank (or missing) means "keep current" — matches the UI's "leave blank" label.
    if (password !== undefined && password !== '') {
      try {
        data.password = await hashPassword(password);
      } catch (e) {
        if (e.code === 'WEAK_PASSWORD') {
          return NextResponse.json({ success: false, error: e.message }, { status: 400 });
        }
        throw e;
      }
    }

    const staff = await prisma.branchStaff.update({
      where: { id },
      data,
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    const { password: _, ...safeStaff } = staff;
    return NextResponse.json({ success: true, staff: safeStaff });
  } catch (error) {
    console.error('Update branch staff error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update branch staff' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Staff ID required' },
        { status: 400 }
      );
    }

    await prisma.branchStaff.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete branch staff error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}