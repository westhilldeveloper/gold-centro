// app/api/branch/auth/login/route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { signToken } from '../../../../../lib/server/auth';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: 'Phone and password required' },
        { status: 400 }
      );
    }

    const staff = await prisma.branchStaff.findUnique({
      where: { phone },
      include: { branch: true },
    });

    if (!staff || staff.password !== password) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    if (!staff.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is inactive' },
        { status: 403 }
      );
    }

    const token = signToken({ id: staff.id, role: staff.role });

    const res = NextResponse.json({
      success: true,
      user: {
        id: staff.id,
        phone: staff.phone,
        name: staff.name,
        role: staff.role,
        branchId: staff.branchId,
        branch: staff.branch,
      },
    });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return res;
  } catch (error) {
    console.error('Branch login error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}