// D:\gold-centro\app\api\branch\cash\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

async function getBranchTotals(client, branchId) {
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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) {
      return NextResponse.json(
        { success: false, error: 'branchId required' },
        { status: 400 }
      );
    }

    const [txns, totals] = await Promise.all([
      prisma.branchCashTransaction.findMany({
        where: { branchId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          counterBranch: { select: { id: true, name: true, code: true } },
        },
      }),
      getBranchTotals(prisma, branchId),
    ]);

    return NextResponse.json({
      success: true,
      transactions: txns,
      balance: totals.balance,
      credits: totals.credits,
      debits: totals.debits,
    });
  } catch (error) {
    console.error('Branch cash GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const {
      branchId,
      type,
      amount,
      purpose,
      description,
      createdBy,
      targetBranchId,
    } = await req.json();

    if (!branchId || !type || !amount || !purpose || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'Missing fields' },
        { status: 400 }
      );
    }
    if (!['CREDIT', 'DEBIT'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction type' },
        { status: 400 }
      );
    }
    if (type === 'CREDIT') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Direct credits are not allowed. Raise a fund request — HO approval will credit the branch automatically.',
        },
        { status: 403 }
      );
    }

    const numAmount = parseFloat(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const isTransfer = !!targetBranchId;
    if (isTransfer) {
      if (targetBranchId === branchId) {
        return NextResponse.json(
          { success: false, error: 'Cannot transfer to the same branch' },
          { status: 400 }
        );
      }
      const target = await prisma.branch.findUnique({
        where: { id: targetBranchId },
        select: { id: true, name: true },
      });
      if (!target) {
        return NextResponse.json(
          { success: false, error: 'Target branch not found' },
          { status: 404 }
        );
      }
    }

    // ── Run inside a ReadCommitted transaction with an advisory lock ──
    // The advisory lock is scoped to the SOURCE branch's cash ledger.
    // For transfers we also take a lock on the destination so both
    // ledgers can't be mutated by another concurrent transfer.
    const lockKeys = [branchId];
    if (isTransfer) lockKeys.push(targetBranchId);
    // Sort to avoid deadlocks between opposite-direction transfers
    lockKeys.sort();

    const result = await prisma.$transaction(
      async (tx) => {
        // Acquire exclusive locks for each affected branch
        for (const key of lockKeys) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'branch_cash_' +
            key}))`;
        }

        const { balance } = await getBranchTotals(tx, branchId);
        if (numAmount > balance + 0.001) {
          const e = new Error(
            `Insufficient balance. Available: ₹${balance.toFixed(
              2
            )}, Requested: ₹${numAmount.toFixed(2)}`
          );
          e.code = 'INSUFFICIENT_BALANCE';
          throw e;
        }

        if (!isTransfer) {
          const txn = await tx.branchCashTransaction.create({
            data: {
              branchId,
              type: 'DEBIT',
              amount: numAmount,
              purpose,
              description: description || null,
              createdBy,
            },
          });
          return { out: txn, in: null };
        }

        // ── Paired transfer entries, atomic ──
        const groupRef = `transfer_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;

        const srcBranch = await tx.branch.findUnique({
          where: { id: branchId },
          select: { name: true, code: true },
        });

        const outTxn = await tx.branchCashTransaction.create({
          data: {
            branchId,
            counterBranchId: targetBranchId,
            type: 'DEBIT',
            amount: numAmount,
            purpose: `Transfer out: ${purpose}`,
            description: description || null,
            reference: groupRef,
            createdBy,
          },
        });

        const inTxn = await tx.branchCashTransaction.create({
          data: {
            branchId: targetBranchId,
            counterBranchId: branchId,
            type: 'CREDIT',
            amount: numAmount,
            purpose: `Transfer in from ${srcBranch?.name || 'branch'}`,
            description: description || null,
            reference: groupRef,
            createdBy,
          },
        });

        return { out: outTxn, in: inTxn };
      },
      {
        isolationLevel: 'ReadCommitted', // default, works cleanly on Neon
        maxWait: 10000, // 10s to acquire a pooled connection
        timeout: 20000, // 20s max transaction duration
      }
    );

    // Sockets
    if (global.io) {
      global.io
        .to(`branch_${branchId}`)
        .emit('cash-updated', result.out);
      if (result.in) {
        global.io
          .to(`branch_${targetBranchId}`)
          .emit('cash-updated', result.in);
      }
    }

    return NextResponse.json({
      success: true,
      transaction: result.out,
      counterpart: result.in,
    });
  } catch (error) {
    // Clean errors we surface to the user
    if (error.code === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    // Deadlock — Neon serialised two opposite transfers, one loses
    if (error.code === 'P2034' || error.message?.includes('deadlock')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Another transaction just completed — please retry.',
        },
        { status: 409 }
      );
    }
    console.error('Branch cash POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}