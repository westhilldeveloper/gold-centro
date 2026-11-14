// D:\gold-centro\app\api\branch\direct-purchase\[id]\post-estimation\route.js
import { prisma } from '../../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { items, finalPrice } = body;

    // ---- Validation ----
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items provided' },
        { status: 400 }
      );
    }

    if (items.some((it) => !it.id)) {
      return NextResponse.json(
        { success: false, error: 'Every item must have an id' },
        { status: 400 }
      );
    }

    const finalPriceNum = parseFloat(finalPrice);
    if (!Number.isFinite(finalPriceNum) || finalPriceNum < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid finalPrice' },
        { status: 400 }
      );
    }

    // ---- Compute total net ----
    const totalNet = items.reduce(
      (sum, i) => sum + (parseFloat(i.netWeight) || 0),
      0
    );

    // ---- Build the operations array (batched, not sequential) ----
    const itemOps = items.map((item) =>
      prisma.orderItem.update({
        where: { id: item.id },
        data: {
          grossWeight: parseFloat(item.grossWeight) || 0,
          stoneWeight: parseFloat(item.stoneWeight) || 0,
          dustWeight: parseFloat(item.dustWeight) || 0,
          netWeight: parseFloat(item.netWeight) || 0,
          ratePerGram: parseFloat(item.ratePerGram) || 0,
          itemPrice: parseFloat(item.itemPrice) || 0,
        },
      })
    );

    const orderOp = prisma.order.update({
      where: { id },
      data: {
        weight: totalNet,
        finalPrice: finalPriceNum,
         status: 'PENDING_PURCHASE_AGREEMENT',
      },
    });

    // ---- Run all updates in ONE transaction with generous timeout ----
    const results = await prisma.$transaction(
      [...itemOps, orderOp],
      {
        maxWait: 10000,   // 10s to acquire a connection from the pool
        timeout: 25000,   // 25s total for the transaction to complete
      }
    );

    // Last result is the order
    const updatedOrder = results[results.length - 1];

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    // ✅ LOG THE ERROR — this is what was missing
    console.error('[Post-estimation] Error:', error);

    // Provide useful error info to the client
    const message =
      error.code === 'P2025'
        ? 'One of the items no longer exists — please reload and retry.'
        : error.code === 'P2028'
        ? 'Transaction timed out. Please retry.'
        : error.message;

    return NextResponse.json(
      { success: false, error: message, code: error.code },
      { status: 500 }
    );
  }
}