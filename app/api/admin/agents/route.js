import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

// ---- LIST all agents ----
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

// ---- CREATE new agent ----
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

    const agent = await prisma.user.create({
      data: {
        name,
        phone,
        role: 'AGENT',
        password: password || null,
        branchId: branchId || null,   // ← ADD
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, agent });
  } catch (error) {
    console.error('Create agent error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}