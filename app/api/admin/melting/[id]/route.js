import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

// ---- GET batch detail ----
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const batch = await prisma.meltingBatch.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        bars: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
    }

    const items = await prisma.orderItem.findMany({
  where: { meltingBatchId: batch.id },
  include: {
    order: {
      select: {
        id: true,
        purity: true,
        customer: { select: { name: true } },
        agent: { select: { name: true } },
      },
    },
  },
});

// Group items: waiting vs melted
const waitingItems = items.filter((it) => it.status === 'IN_MELTING');
const meltedItems = items.filter((it) => it.status === 'MELTED');

// Fetch the bars with their melted items
const bars = await prisma.goldBar.findMany({
  where: { batchId: batch.id },
  orderBy: { createdAt: 'asc' },
});

// For each bar, attach its items
const barsWithItems = bars.map((bar) => ({
  ...bar,
  items: meltedItems.filter((it) => it.meltedIntoBarId === bar.id),
}));

    // Resolve user names
    const ids = new Set([batch.sentBy, batch.handledBy, ...batch.bars.map((b) => b.handledBy)].filter(Boolean));
    const idArr = Array.from(ids);
    const userMap = {};
    if (idArr.length) {
      const [users, staff] = await Promise.all([
        prisma.user.findMany({ where: { id: { in: idArr } }, select: { id: true, name: true } }),
        prisma.branchStaff.findMany({ where: { id: { in: idArr } }, select: { id: true, name: true } }),
      ]);
      users.forEach((u) => { userMap[u.id] = u.name; });
      staff.forEach((s) => { userMap[s.id] = s.name; });
    }

   return NextResponse.json({
  success: true,
  batch: {
    ...batch,
    sentByName: userMap[batch.sentBy] || 'Unknown',
    handledByName: batch.handledBy ? userMap[batch.handledBy] : null,
  },
  items: {
    waiting: waitingItems,
    melted: meltedItems,
    all: items,
  },
  bars: barsWithItems,
});
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ---- PUT: update status (PENDING → IN_PROGRESS, or CANCELLED) ----
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!['PENDING', 'IN_PROGRESS', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const batch = await prisma.meltingBatch.findUnique({ where: { id } });
    if (!batch) {
      return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
    }
    if (batch.status === 'COMPLETED') {
      return NextResponse.json({ success: false, error: 'Batch already completed' }, { status: 400 });
    }

    // Cancel: return items to branch
    if (status === 'CANCELLED') {
  await prisma.$transaction(async (tx) => {
    const batchItems = await tx.orderItem.findMany({
      where: { id: { in: batch.itemIds }, status: 'IN_MELTING' },
      select: { id: true, originBranchId: true },
    });

    for (const it of batchItems) {
      await tx.orderItem.update({
        where: { id: it.id },
        data: {
          status: 'ACTIVE',
          meltingBatchId: null,
          currentBranchId: it.originBranchId,
          originBranchId: null,
        },
      });
    }

    await tx.meltingBatch.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  });
  return NextResponse.json({ success: true });
}

    const updated = await prisma.meltingBatch.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, batch: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}