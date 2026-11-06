import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// ------------------------------------------------------------
// GET /api/orders/[id]/pledge-details
// Returns the pledge fields for a single order.
// ------------------------------------------------------------
export async function GET(_req, { params }) {
  try {
    const { id } = params;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        isPledged: true,
        pledgeBankName: true,
        pledgeLoanAccountNo: true,
        pledgeOutstandingAmount: true,
        pledgeDeclarationUrl: true,
        pledgeDeclarationUploadedAt: true,
        pledgeDeclarationUploadedBy: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('pledge-details GET error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// POST /api/orders/[id]/pledge-details
// Creates or replaces the pledge details.
// Body: { isPledged, bankName, loanAccountNo, outstandingAmount, updatedBy }
// ------------------------------------------------------------
export async function POST(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));

    const {
      isPledged,
      bankName,
      loanAccountNo,
      outstandingAmount,
      updatedBy,
    } = body;

    // ---- Validate ----
    if (typeof isPledged !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isPledged (boolean) is required' },
        { status: 400 }
      );
    }

    if (isPledged) {
      if (!bankName || !bankName.trim()) {
        return NextResponse.json(
          { success: false, error: 'bankName is required when isPledged is true' },
          { status: 400 }
        );
      }
      if (!loanAccountNo || !loanAccountNo.trim()) {
        return NextResponse.json(
          { success: false, error: 'loanAccountNo is required when isPledged is true' },
          { status: 400 }
        );
      }
      if (
        outstandingAmount === undefined ||
        outstandingAmount === null ||
        isNaN(Number(outstandingAmount)) ||
        Number(outstandingAmount) < 0
      ) {
        return NextResponse.json(
          { success: false, error: 'outstandingAmount must be a non-negative number' },
          { status: 400 }
        );
      }
    }

    // ---- Make sure order exists ----
    const existing = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, pledgeDeclarationUrl: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Optional: prevent edits after completion
    if (existing.status === 'COMPLETED' && isPledged) {
      return NextResponse.json(
        { success: false, error: 'Cannot modify pledge details of a completed order' },
        { status: 409 }
      );
    }

    // ---- Write ----
    const order = await prisma.order.update({
      where: { id },
      data: {
        isPledged,
        pledgeBankName: isPledged ? bankName.trim() : null,
        pledgeLoanAccountNo: isPledged ? loanAccountNo.trim() : null,
        pledgeOutstandingAmount: isPledged ? Number(outstandingAmount) : null,
        // If admin un-pledges an order, clear the declaration too.
        // If the declaration is still needed, keep it.
        ...(isPledged
          ? {}
          : {
              pledgeDeclarationUrl: null,
              pledgeDeclarationUploadedAt: null,
              pledgeDeclarationUploadedBy: null,
            }),
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, aadhaarNumber: true, panNumber: true },
        },
        agent: { select: { id: true, name: true, phone: true } },
        items: true,
      },
    });

    // Notify via socket (non-blocking) — see note below
    try {
     if (global.io) {
  try {
    // 1. Notify Admin
    global.io.to('admin').emit('order-updated', order);
    
    // 2. Notify Agent (Remember to use `user:` not `agent:`)
    if (order.agentId) {
      global.io.to(`user:${order.agentId}`).emit('order-updated', order);
    }
  } catch (err) {
    console.error('Socket emit failed:', err);
  }
}
    } catch {
      // Socket server helper may not exist yet — safe to ignore
    }

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('pledge-details POST error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// PATCH /api/orders/[id]/pledge-details
// Partial update — only the fields you send are written.
// Body: any subset of { isPledged, bankName, loanAccountNo, outstandingAmount }
// ------------------------------------------------------------
export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));

    const existing = await prisma.order.findUnique({
      where: { id },
      select: { id: true, isPledged: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const data = {};

    if (typeof body.isPledged === 'boolean') {
      data.isPledged = body.isPledged;
    }

    if (body.bankName !== undefined) {
      if (body.bankName !== null && typeof body.bankName !== 'string') {
        return NextResponse.json(
          { success: false, error: 'bankName must be a string or null' },
          { status: 400 }
        );
      }
      data.pledgeBankName = body.bankName?.trim() || null;
    }

    if (body.loanAccountNo !== undefined) {
      if (body.loanAccountNo !== null && typeof body.loanAccountNo !== 'string') {
        return NextResponse.json(
          { success: false, error: 'loanAccountNo must be a string or null' },
          { status: 400 }
        );
      }
      data.pledgeLoanAccountNo = body.loanAccountNo?.trim() || null;
    }

    if (body.outstandingAmount !== undefined) {
      const n = Number(body.outstandingAmount);
      if (body.outstandingAmount !== null && (isNaN(n) || n < 0)) {
        return NextResponse.json(
          { success: false, error: 'outstandingAmount must be a non-negative number or null' },
          { status: 400 }
        );
      }
      data.pledgeOutstandingAmount =
        body.outstandingAmount === null ? null : n;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { id },
      data,
      include: {
        customer: {
          select: { id: true, name: true, phone: true, aadhaarNumber: true, panNumber: true },
        },
        agent: { select: { id: true, name: true, phone: true } },
        items: true,
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('pledge-details PATCH error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}