// D:\gold-centro\app\api\admin\melting\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const batches = await prisma.meltingBatch.findMany({
      orderBy: { sentAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        bars: true,
      },
      take: 200,
    });

    const userIds = new Set();
    batches.forEach((b) => {
      if (b.sentBy) userIds.add(b.sentBy);
      if (b.handledBy) userIds.add(b.handledBy);
      b.bars.forEach((bar) => bar.handledBy && userIds.add(bar.handledBy));
    });

    const idArr = Array.from(userIds);
    const userMap = {};

    if (idArr.length) {
      const [users, staff] = await Promise.all([
        prisma.user.findMany({ where: { id: { in: idArr } }, select: { id: true, name: true } }),
        prisma.branchStaff.findMany({ where: { id: { in: idArr } }, select: { id: true, name: true } }),
      ]);
      users.forEach((u) => { userMap[u.id] = u.name; });
      staff.forEach((s) => { userMap[s.id] = s.name; });
    }

    const enriched = batches.map((b) => ({
      ...b,
      sentByName: userMap[b.sentBy] || 'Unknown',
      handledByName: b.handledBy ? userMap[b.handledBy] || 'Unknown' : null,
      bars: b.bars.map((bar) => ({
        ...bar,
        handledByName: userMap[bar.handledBy] || 'Unknown',
      })),
    }));

    return NextResponse.json({ success: true, batches: enriched });
  } catch (error) {
    console.error('Fetch melting batches error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ---- CREATE: ONE batch for ALL selected items (NO purity split) ----
// ---- CREATE: ONE batch for ALL selected items (from main branch only) ----
export async function POST(req) {
  try {
    const { itemIds, sentBy, notes } = await req.json();

    if (!itemIds?.length || !sentBy) {
      return NextResponse.json(
        { success: false, error: 'itemIds and sentBy are required' },
        { status: 400 }
      );
    }

    // ---- 1. Main branch is required ----
    const mainBranch = await prisma.branch.findFirst({
      where: { isHeadOffice: true },
      select: { id: true },
    });
    if (!mainBranch) {
      return NextResponse.json(
        { success: false, error: 'No head office branch configured' },
        { status: 400 }
      );
    }

    // ---- 2. Only items currently at main branch ----
    const items = await prisma.orderItem.findMany({
      where: {
        id: { in: itemIds },
        status: 'ACTIVE',
        currentBranchId: mainBranch.id,
      },
      include: { order: { select: { purity: true } } },
    });

    if (items.length !== itemIds.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Some items are invalid, already in melting, or not at the main branch',
        },
        { status: 400 }
      );
    }

    // ---- 3. Purity label from ITEM-level purity ----
    const purities = new Set(
      items.map((it) => it.purity || it.order?.purity).filter(Boolean)
    );
    const isMixed = purities.size > 1;
    const batchPurity = isMixed
      ? 'MIXED'
      : Array.from(purities)[0] || 'Unknown';

    const fromBranchIds = Array.from(
      new Set(items.map((it) => it.currentBranchId).filter(Boolean))
    );

    const totalNet = items.reduce((s, it) => s + it.netWeight, 0);
    const totalGross = items.reduce((s, it) => s + it.grossWeight, 0);

    const count = await prisma.meltingBatch.count();
    const year = new Date().getFullYear();
    const batchCode = `MELT-${year}-${String(count + 1).padStart(4, '0')}`;

    const batch = await prisma.$transaction(async (tx) => {
      const created = await tx.meltingBatch.create({
        data: {
          batchCode,
          branchId: null,
          fromBranchIds,
          itemIds,
          purity: batchPurity,
          totalInputWeight: totalNet,
          totalInputGross: totalGross,
          status: 'PENDING',
          sentBy,
          notes: notes || null,
        },
      });

      // Move each item out of branch custody into melting
      for (const item of items) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            status: 'IN_MELTING',
            meltingBatchId: created.id,
            originBranchId: item.currentBranchId, // remember where it came from
            currentBranchId: null, // ← removed from branch stock
          },
        });
      }

      return created;
    });

    return NextResponse.json({ success: true, batches: [batch] });
  } catch (error) {
    console.error('Create melting batch error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}