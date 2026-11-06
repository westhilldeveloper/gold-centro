// D:\gold-centro\app\api\branch\agents\[id]\route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const agent = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        profilePhoto: true,
        branchId: true,
        createdAt: true,
      },
    });
    if (!agent || agent.role !== 'AGENT') {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, agent });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, phone, profilePhoto } = body || {};

    // --- Basic validation ---
    if (name != null && !String(name).trim()) {
      return NextResponse.json(
        { success: false, error: 'Name cannot be empty' },
        { status: 400 }
      );
    }
    if (phone != null) {
      const phoneStr = String(phone).trim();
      if (!/^\d{10}$/.test(phoneStr)) {
        return NextResponse.json(
          { success: false, error: 'Phone must be 10 digits' },
          { status: 400 }
        );
      }
    }

    // --- Check the agent exists and is actually an AGENT ---
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, phone: true },
    });
    if (!existing || existing.role !== 'AGENT') {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    // --- Phone change: ensure no other user already uses it ---
    if (phone != null && String(phone).trim() !== existing.phone) {
      const phoneStr = String(phone).trim();
      const clash = await prisma.user.findUnique({
        where: { phone: phoneStr },
        select: { id: true },
      });
      if (clash && clash.id !== id) {
        return NextResponse.json(
          { success: false, error: 'Phone already registered to another user' },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name != null && { name: String(name).trim() }),
        ...(phone != null && { phone: String(phone).trim() }),
        ...(profilePhoto !== undefined && {
          profilePhoto: profilePhoto || null,
        }),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        profilePhoto: true,
        createdAt: true,
        _count: { select: { assigned: true } },
      },
    });

    return NextResponse.json({ success: true, agent: updated });
  } catch (error) {
    console.error('Update agent error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}