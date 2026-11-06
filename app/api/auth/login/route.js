// app/api/auth/login/route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { signToken } from '../../../../lib/server/auth';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { phone, role, name } = await req.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      // ⚠️ First signup: force CUSTOMER. Admins/agents must be created
      // via seed script or a protected admin route — never from the client.
      user = await prisma.user.create({
        data: {
          phone,
          name: name || `User_${phone.slice(-4)}`,
          role: 'CUSTOMER',
        },
      });
    }

    const token = signToken({ id: user.id, role: user.role });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        aadhaarFront: user.aadhaarFront || null,
        aadhaarBack: user.aadhaarBack || null,
        aadhaarNumber: user.aadhaarNumber || null,
      },
    });

    res.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,   // 7 days, matches JWT expiry
      path: '/',
    });

    return res;
  } catch (err) {
    console.error('Login API Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}