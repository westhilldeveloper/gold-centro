import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { name, phone, password, role, isActive } = await req.json();

    const data = {};
    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (password) data.password = password;
    if (role) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;

    const staff = await prisma.branchStaff.update({ where: { id }, data });
    return NextResponse.json({ success: true, staff });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await prisma.branchStaff.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}