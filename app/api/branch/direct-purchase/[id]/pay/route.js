// app/api/branch/direct-purchase/[id]/pay/route.js
import { prisma } from '../../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      paymentMode,
      reference,
      bankDetails,    // { accountName, accountNo, ifsc, bankName }
      upiDetails,     // { upiId }
      chequeDetails,  // { chequeNo, bankName, chequeDate }
      saveCustomerBank, // boolean
      createdBy,
    } = body;

    // ──────────── Validation ────────────
    if (!['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE'].includes(paymentMode)) {
      return NextResponse.json({ success: false, error: 'Invalid payment mode' }, { status: 400 });
    }

    if (paymentMode === 'BANK_TRANSFER') {
      if (!bankDetails?.accountNo || !bankDetails?.ifsc || !bankDetails?.accountName) {
        return NextResponse.json(
          { success: false, error: 'Account number, IFSC, and account holder name are required for bank transfer' },
          { status: 400 }
        );
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifsc.trim().toUpperCase())) {
        return NextResponse.json({ success: false, error: 'Invalid IFSC format' }, { status: 400 });
      }
    }

    if (paymentMode === 'UPI' && !upiDetails?.upiId) {
      return NextResponse.json({ success: false, error: 'UPI ID is required' }, { status: 400 });
    }

    if (paymentMode === 'CHEQUE') {
      if (!chequeDetails?.chequeNo || !chequeDetails?.bankName || !chequeDetails?.chequeDate) {
        return NextResponse.json(
          { success: false, error: 'Cheque number, bank name, and cheque date are required' },
          { status: 400 }
        );
      }
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.orderType !== 'BRANCH_DIRECT') {
      return NextResponse.json({ success: false, error: 'Invalid order' }, { status: 404 });
    }
    if (order.status !== 'PENDING_PAYMENT') {
      return NextResponse.json(
        { success: false, error: `Order is in "${order.status}" status, not ready for payment` },
        { status: 400 }
      );
    }

    // ──────────── Build paymentDetails JSON ────────────
    let paymentDetails = null;
    if (paymentMode === 'BANK_TRANSFER') {
      paymentDetails = {
        accountName: bankDetails.accountName.trim(),
        accountNo: bankDetails.accountNo.trim(),
        ifsc: bankDetails.ifsc.trim().toUpperCase(),
        bankName: bankDetails.bankName?.trim() || null,
      };
    } else if (paymentMode === 'UPI') {
      paymentDetails = { upiId: upiDetails.upiId.trim() };
    } else if (paymentMode === 'CHEQUE') {
      paymentDetails = {
        chequeNo: chequeDetails.chequeNo.trim(),
        bankName: chequeDetails.bankName.trim(),
        chequeDate: new Date(chequeDetails.chequeDate).toISOString(),
      };
    }

    // ──────────── Transaction ────────────
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. CASH: lock branch ledger + check balance + debit
        if (paymentMode === 'CASH') {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'branch_cash_' + order.branchId}))`;

          const [creditAgg, debitAgg] = await Promise.all([
            tx.branchCashTransaction.aggregate({
              where: { branchId: order.branchId, type: 'CREDIT' },
              _sum: { amount: true },
            }),
            tx.branchCashTransaction.aggregate({
              where: { branchId: order.branchId, type: 'DEBIT' },
              _sum: { amount: true },
            }),
          ]);
          const balance = (creditAgg._sum.amount || 0) - (debitAgg._sum.amount || 0);

          if ((order.finalPrice || 0) > balance) {
            throw new Error(
              `Insufficient branch cash. Available: ₹${balance.toFixed(2)}, Needed: ₹${order.finalPrice?.toFixed(2)}`
            );
          }

          await tx.branchCashTransaction.create({
            data: {
              branchId: order.branchId,
              type: 'DEBIT',
              amount: order.finalPrice || 0,
              purpose: `Direct Gold Purchase #${order.id.slice(-6)}`,
              description: reference ? `Ref: ${reference}` : null,
              reference: order.id,
              createdBy: createdBy || order.staffId,
            },
          });
        }

        // 2. Save customer bank details (for future auto-fill)
        if (paymentMode === 'BANK_TRANSFER' && saveCustomerBank && order.customerId) {
          await tx.user.update({
            where: { id: order.customerId },
            data: {
              bankAccountName: bankDetails.accountName.trim(),
              bankAccountNo: bankDetails.accountNo.trim(),
              bankIfsc: bankDetails.ifsc.trim().toUpperCase(),
              bankName: bankDetails.bankName?.trim() || null,
            },
          });
        }

        // 3. Mark order complete + record payment metadata
        const updatedOrder = await tx.order.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            paymentMode,
            paymentReference: reference?.trim() || null,
            paymentDetails,
            paymentStatus: paymentMode === 'CASH' ? 'CASH_PAID' : 'MANUAL_TRANSFER',
            depositedToBranch: true,
            depositedAt: new Date(),
          },
        });

        // 4. Move items into branch stock
        await tx.orderItem.updateMany({
          where: { orderId: id },
          data: { status: 'ACTIVE', currentBranchId: order.branchId },
        });

        return updatedOrder;
      },
      { maxWait: 10000, timeout: 25000 }
    );

    return NextResponse.json({ success: true, order: result });
  } catch (error) {
    console.error('[Pay] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}