// D:\gold-centro\app\api\branch\agent-cash-requests\[id]\route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

// Sum credits and debits for a branch — works inside or outside a transaction.
async function getBranchBalance(client, branchId) {
  const [creditAgg, debitAgg] = await Promise.all([
    client.branchCashTransaction.aggregate({
      where: { branchId, type: 'CREDIT' },
      _sum: { amount: true },
    }),
    client.branchCashTransaction.aggregate({
      where: { branchId, type: 'DEBIT' },
      _sum: { amount: true },
    }),
  ]);
  const credits = creditAgg._sum.amount || 0;
  const debits = debitAgg._sum.amount || 0;
  return { credits, debits, balance: credits - debits };
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const { action, staffId, reviewNote } = await req.json();

    if (!id || !action || !staffId) {
      return NextResponse.json(
        { success: false, error: 'Missing fields' },
        { status: 400 }
      );
    }
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    const cashRequest = await prisma.agentCashRequest.findUnique({
      where: { id },
    });
    if (!cashRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }
    if (cashRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Already reviewed' },
        { status: 400 }
      );
    }

    // ── REJECT — simple update, no cash impact ──
    if (action === 'reject') {
      const updated = await prisma.agentCashRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedBy: staffId,
          reviewNote: reviewNote || null,
          reviewedAt: new Date(),
        },
      });

      if (global.io) {
        global.io
          .to(`agent_${cashRequest.agentId}`)
          .emit('agent-cash-request-updated', updated);
      }

      return NextResponse.json({ success: true, request: updated });
    }

    // ── APPROVE — atomic: check balance, credit agent, debit branch ──
    const MAX_ATTEMPTS = 3;
    let lastError = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const result = await prisma.$transaction(
  async (tx) => {
    // Lock the branch ledger so no concurrent debit can sneak in
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'branch_cash_' +
      cashRequest.branchId}))`;

    const { balance } = await getBranchBalance(tx, cashRequest.branchId);
    if (cashRequest.amount > balance + 0.001) {
      const e = new Error(
        `Insufficient branch cash. Available: ₹${balance.toFixed(
          2
        )}, Needed: ₹${cashRequest.amount.toFixed(2)}`
      );
      e.code = 'INSUFFICIENT_BALANCE';
      throw e;
    }

            // 2) Mark request approved
            const updated = await tx.agentCashRequest.update({
              where: { id },
              data: {
                status: 'APPROVED',
                reviewedBy: staffId,
                reviewNote: reviewNote || null,
                reviewedAt: new Date(),
              },
            });

            // 3) Credit the agent
            const agentTxn = await tx.agentCashTransaction.create({
              data: {
                agentId: cashRequest.agentId,
                type: 'CREDIT',
                amount: cashRequest.amount,
                purpose: `Cash request approved: ${cashRequest.purpose}`,
                description: cashRequest.description || null,
                reference: cashRequest.id,
                requestId: cashRequest.id,
                createdBy: staffId,
              },
            });

            // 4) Debit the branch ledger
            const branchTxn = await tx.branchCashTransaction.create({
              data: {
                branchId: cashRequest.branchId,
                type: 'DEBIT',
                amount: cashRequest.amount,
                purpose: `Agent cash payout: ${cashRequest.purpose}`,
                description: cashRequest.description || null,
                reference: cashRequest.id,
                createdBy: staffId,
              },
            });

            return { updated, agentTxn, branchTxn };
          },
          {
    isolationLevel: 'ReadCommitted',
    maxWait: 10000,
    timeout: 20000,
  }
        );

        // ── Socket notifications ──
        if (global.io) {
          // Agent side — request updated + cash credited
          global.io
            .to(`agent_${cashRequest.agentId}`)
            .emit('agent-cash-request-updated', result.updated);
          global.io
            .to(`agent_${cashRequest.agentId}`)
            .emit('agent-cash-updated', result.agentTxn);

          // Branch side — cash balance changed, refresh the ledger
          global.io
            .to(`branch_${cashRequest.branchId}`)
            .emit('cash-updated', result.branchTxn);
        }

        return NextResponse.json({
          success: true,
          request: result.updated,
        });
      } catch (err) {
        // Serialisation conflict — retry
        if (err.code === 'P2034') {
          lastError = err;
          continue;
        }
        // Balance check failure — return clean error
        if (err.code === 'INSUFFICIENT_BALANCE') {
          return NextResponse.json(
            { success: false, error: err.message },
            { status: 400 }
          );
        }
        throw err;
      }
    }

    console.error('Approve agent cash request — retries exhausted:', lastError);
    return NextResponse.json(
      {
        success: false,
        error: 'Another transaction is in progress — please retry',
      },
      { status: 409 }
    );
  } catch (error) {
    console.error('Review agent cash request error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}