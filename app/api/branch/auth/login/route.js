// app/api/branch/auth/login/route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { signToken } from '../../../../../lib/server/auth';
import { verifyPassword, hashPassword } from '../../../../../lib/server/password';

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

    // Generic failure — same response for missing user, missing password, wrong password.
    const fail = () =>
      NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );

    if (!staff || !staff.password) return fail();

    const ok = await verifyPassword(password, staff.password);
    if (!ok) return fail();

    // One-time upgrade: if the DB still has a plaintext password, rehash now.
    // verifyPassword already accepted it (legacy branch), so this is lossless.
    if (!staff.password.startsWith('$2')) {
      try {
        await prisma.branchStaff.update({
          where: { id: staff.id },
          data: { password: await hashPassword(password) },
        });
      } catch (e) {
        console.warn('branch staff rehash failed (non-fatal)', e);
      }
    }

    if (!staff.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is inactive' },
        { status: 403 }
      );
    }

    const token = signToken({ id: staff.id, role: staff.role });
    const isProd = process.env.NODE_ENV === 'production';

    const res = NextResponse.json({
      success: true,
      token,
      user: {
        id: staff.id,
        phone: staff.phone,
        name: staff.name,
        role: staff.role,
        branchId: staff.branchId,
        branch: staff.branch,
        userType: 'BRANCH_STAFF',   // ← bonus: keeps AuthContext happy without client-side coercion
      },
    });

    res.cookies.set('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return res;
  } catch (error) {
    console.error('Branch login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}