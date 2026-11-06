import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { name, phone, password, role, branchId, isActive } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Staff ID required' },
        { status: 400 }
      );
    }

    // Ensure phone uniqueness if changing
    if (phone) {
      const existing = await prisma.branchStaff.findUnique({ where: { phone } });
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { success: false, error: 'Phone number already in use' },
          { status: 400 }
        );
      }
    }

    const data = {};
    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (password) data.password = password;
    if (role) data.role = role;
    if (branchId) data.branchId = branchId;
    if (isActive !== undefined) data.isActive = isActive;

    const staff = await prisma.branchStaff.update({
      where: { id },
      data,
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, staff });
  } catch (error) {
    console.error('Update branch staff error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
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