import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

// 🔒 Ensure Node runtime so global.io is available
export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { userId, code, orderId } = await req.json();

    if (!userId || !code || !orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Look up a valid, unused, unexpired OTP for this user (and ideally this order)
    const otp = await prisma.oTP.findFirst({
      where: {
        userId,
        code,
        used: false,
        expiresAt: { gt: new Date() },
        // orderId, // ← uncomment if your schema has this
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // 2. Order must exist, belong to this user, and still be in DRAFT
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, customerId: true, status: true },
    });

    if (!existing || existing.customerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Order not found or unauthorized' },
        { status: 403 }
      );
    }
    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: `Cannot verify order in status ${existing.status}` },
        { status: 409 }
      );
    }

    // 3. Consume the OTP atomically — only one concurrent request wins
    const consumed = await prisma.oTP.updateMany({
      where: { id: otp.id, used: false },
      data: { used: true },
    });
    if (consumed.count !== 1) {
      return NextResponse.json(
        { success: false, error: 'OTP already used' },
        { status: 400 }
      );
    }

    // 4. Flip status + include customer in one call
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'OTP_VERIFIED' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    // 5. Best-effort emit — never fails the request 
    if (global.io) {
      try {
        global.io.to('admin').emit('new-order', order);
      } catch (emitErr) {
        console.error('Socket emit failed (non-fatal):', emitErr);
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('OTP verify error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}