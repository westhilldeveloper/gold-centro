import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/server/password';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const agents = await prisma.user.findMany({
      where: { role: 'AGENT' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        branchId: true,
        createdAt: true,
        branch: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { assigned: true },
        },
      },
    });
    return NextResponse.json({ success: true, agents });
  } catch (error) {
    console.error('Fetch agents error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { name, phone, password, branchId } = await req.json();

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Phone number already registered' },
        { status: 400 }
      );
    }

    let hashed = null;
    if (password) {
      try {
        hashed = await hashPassword(password);
      } catch (e) {
        if (e.code === 'WEAK_PASSWORD') {
          return NextResponse.json({ success: false, error: e.message }, { status: 400 });
        }
        throw e;
      }
    }

    const agent = await prisma.user.create({
      data: {
        name,
        phone,
        role: 'AGENT',
        password: hashed,             // ← now a bcrypt hash
        branchId: branchId || null,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    // Do NOT return the password field
    const { password: _, ...safeAgent } = agent;
    return NextResponse.json({ success: true, agent: safeAgent });
  } catch (error) {
    console.error('Create agent error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}

