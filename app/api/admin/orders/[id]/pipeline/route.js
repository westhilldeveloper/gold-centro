// app/api/admin/orders/[id]/pipeline/route.js
import { prisma } from '../../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, aadhaarNumber: true } },
        agent: { select: { id: true, name: true, phone: true, branch: { select: { id: true, name: true, code: true } } } },
        staff: { select: { id: true, name: true, phone: true } },
        branch: { select: { id: true, name: true, code: true, phone: true } },
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const itemIds = order.items.map((i) => i.id);

    const [deposit, movements, meltingBatches] = await Promise.all([
      prisma.agentDeposit.findFirst({
        where: { orderIds: { has: id } },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          agent: { select: { id: true, name: true } },
        },
      }),
      itemIds.length
        ? prisma.stockMovement.findMany({
            where: { itemIds: { hasSome: itemIds } },
            include: {
              fromBranch: { select: { id: true, name: true, code: true } },
              toBranch: { select: { id: true, name: true, code: true } },
            },
            orderBy: { createdAt: 'asc' },
          })
        : [],
      itemIds.length
        ? prisma.meltingBatch.findMany({
            where: { itemIds: { hasSome: itemIds } },
            include: {
              branch: { select: { id: true, name: true, code: true } },
              bars: {
                include: {
                  currentBranch: { select: { id: true, name: true, code: true } },
                },
              },
            },
            orderBy: { sentAt: 'asc' },
          })
        : [],
    ]);

    // Resolve branch IDs
    const branchIdsToResolve = new Set();
    order.items.forEach((i) => {
      if (i.currentBranchId) branchIdsToResolve.add(i.currentBranchId);
    });
    movements.forEach((m) => {
      if (m.fromBranchId) branchIdsToResolve.add(m.fromBranchId);
      if (m.toBranchId) branchIdsToResolve.add(m.toBranchId);
    });
    meltingBatches.forEach((b) => {
      if (b.branchId) branchIdsToResolve.add(b.branchId);
      b.bars.forEach((bar) => {
        if (bar.currentBranchId) branchIdsToResolve.add(bar.currentBranchId);
      });
    });

    const branchMap = {};
    if (branchIdsToResolve.size) {
      const list = await prisma.branch.findMany({
        where: { id: { in: Array.from(branchIdsToResolve) } },
        select: { id: true, name: true, code: true },
      });
      list.forEach((b) => {
        branchMap[b.id] = b;
      });
    }

    // Build per-item pipelines
    const itemPipelines = order.items.map((item) => {
      const timeline = [];

      // 1) Item recorded
      timeline.push({
        stage: 'RECORDED',
        label: 'Item recorded',
        description:
          order.orderType === 'BRANCH_DIRECT'
            ? `Added by ${order.staff?.name || 'Staff'} at branch`
            : `Added by ${order.agent?.name || 'Agent'}`,
        timestamp: item.createdAt,
        actor:
          order.orderType === 'BRANCH_DIRECT'
            ? order.staff
              ? { name: order.staff.name, role: 'STAFF' }
              : null
            : order.agent
            ? { name: order.agent.name, role: 'AGENT' }
            : null,
        location: order.orderType === 'BRANCH_DIRECT' ? order.branch : null,
        icon: 'document',
        color: 'blue',
      });

      // 2) Purchase completed
      if (order.status === 'COMPLETED') {
        timeline.push({
          stage: 'PURCHASED',
          label: 'Purchase completed',
          description: `Final: ₹${(
            order.finalPrice ||
            order.agentOffer ||
            0
          ).toFixed(2)} • ${order.paymentMode || 'N/A'}`,
          timestamp: order.updatedAt,
          actor: order.customer
            ? { name: order.customer.name, role: 'CUSTOMER' }
            : null,
          location: null,
          icon: 'check',
          color: 'green',
        });
      }

      // 3) Deposit
      if (deposit) {
        timeline.push({
          stage: 'DEPOSITED',
          label: `Deposited at ${deposit.branch?.name || 'branch'}`,
          description: `Handed over by ${deposit.agent?.name || 'agent'}`,
          timestamp: deposit.depositedAt,
          actor: deposit.agent
            ? { name: deposit.agent.name, role: 'AGENT' }
            : null,
          location: deposit.branch,
          icon: 'building',
          color: 'purple',
        });
      }

      // 4) Movements that touched THIS item
      const itemMovements = movements.filter((m) =>
        (m.itemIds || []).includes(item.id)
      );
      itemMovements.forEach((m) => {
        const fromName = m.fromBranch?.name || 'External';
        const toName = m.toBranch?.name || 'External';

        timeline.push({
          stage: 'MOVEMENT_SENT',
          label: `Sent from ${fromName}`,
          description: [
            `To ${toName}`,
            m.handedOverByName ? `Handed over by ${m.handedOverByName}` : null,
            m.carrierName
              ? `Carried by ${m.carrierName}${
                  m.carrierPhone ? ` (${m.carrierPhone})` : ''
                }`
              : null,
          ]
            .filter(Boolean)
            .join(' • '),
          timestamp: m.createdAt,
          actor: m.carrierName
            ? { name: m.carrierName, role: m.carrierType || 'CARRIER' }
            : null,
          location: m.fromBranch,
          icon: 'truck',
          color: 'yellow',
          movementId: m.id,
          // ✅ CHANGED
          transferNoteUrl: m.transferNoteUrl || null,
          siblingCount: (m.itemIds || []).length - 1,
        });

        if (m.status === 'RECEIVED' && m.receivedAt) {
          timeline.push({
            stage: 'MOVEMENT_RECEIVED',
            label: `Received at ${toName}`,
            description: m.receivedByName
              ? `Received by ${m.receivedByName}`
              : 'Confirmed',
            timestamp: m.receivedAt,
            actor: m.receivedByName
              ? { name: m.receivedByName, role: 'RECEIVER' }
              : null,
            location: m.toBranch,
            icon: 'check',
            color: 'green',
            movementId: m.id,
            // ✅ ADDED
            receivingNoteUrl: m.receivingNoteUrl || null,
          });
        } else if (m.status === 'CANCELLED') {
          timeline.push({
            stage: 'MOVEMENT_CANCELLED',
            label: 'Movement cancelled',
            description: `Returned to ${fromName}`,
            timestamp: m.updatedAt,
            actor: null,
            location: m.fromBranch,
            icon: 'x',
            color: 'red',
            movementId: m.id,
          });
        } else if (m.status === 'IN_TRANSIT') {
          timeline.push({
            stage: 'MOVEMENT_IN_TRANSIT',
            label: `In transit to ${toName}`,
            description: 'Awaiting receipt confirmation',
            timestamp: m.updatedAt,
            actor: null,
            location: m.toBranch,
            icon: 'truck',
            color: 'yellow',
            movementId: m.id,
          });
        }
      });

      // 5) Melting batch
      const itemBatch = meltingBatches.find((b) =>
        (b.itemIds || []).includes(item.id)
      );
      if (itemBatch) {
        const siblingCount = (itemBatch.itemIds || []).length - 1;
        timeline.push({
          stage: 'SENT_TO_MELTING',
          label: `Sent for melting (${itemBatch.batchCode})`,
          description: `Batch at ${
            itemBatch.branch?.name || 'branch'
          } • Input ${itemBatch.totalInputWeight.toFixed(2)}g${
            siblingCount > 0 ? ` • With ${siblingCount} other item(s)` : ''
          }`,
          timestamp: itemBatch.sentAt,
          actor: null,
          location: itemBatch.branch,
          icon: 'fire',
          color: 'orange',
          batchId: itemBatch.id,
          batchCode: itemBatch.batchCode,
          siblingCount,
        });

        if (itemBatch.status === 'COMPLETED' && itemBatch.completedAt) {
          timeline.push({
            stage: 'MELTED',
            label: `Melted into ${itemBatch.bars.length} bar(s)`,
            description: itemBatch.bars
              .map((b) => `${b.barCode} (${b.weight.toFixed(2)}g)`)
              .join(', '),
            timestamp: itemBatch.completedAt,
            actor: null,
            location: itemBatch.branch,
            icon: 'bars',
            color: 'green',
            batchId: itemBatch.id,
            barIds: itemBatch.bars.map((b) => b.id),
            siblingCount,
          });
        } else if (
          itemBatch.status === 'IN_PROGRESS' ||
          itemBatch.status === 'PENDING'
        ) {
          timeline.push({
            stage: 'MELTING_IN_PROGRESS',
            label: 'Melting in progress',
            description: 'Batch is being processed',
            timestamp: new Date(),
            actor: null,
            location: itemBatch.branch,
            icon: 'fire',
            color: 'orange',
            batchId: itemBatch.id,
          });
        }
      }

      timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // ---- Current status ----
      let currentStatus = 'UNKNOWN';
      let currentLocationLabel = 'Unknown';
      let currentLocationId = null;

      if (item.status === 'MELTED') {
        currentStatus = 'MELTED';
        const bar = itemBatch?.bars.find((b) => b.id === item.meltedIntoBarId);
        currentLocationLabel = bar ? `Melted into ${bar.barCode}` : 'Melted';
      } else if (item.status === 'IN_MELTING') {
        currentStatus = 'IN_MELTING';
        currentLocationLabel = itemBatch
          ? `Melting (${itemBatch.batchCode})`
          : 'In melting';
      } else if (item.currentBranchId) {
        const b = branchMap[item.currentBranchId];
        currentStatus = 'AT_BRANCH';
        currentLocationLabel = b ? `At ${b.name} (${b.code})` : 'At branch';
        currentLocationId = item.currentBranchId;
      } else if (order.status === 'COMPLETED' && !order.depositedToBranch) {
        currentStatus = 'WITH_AGENT';
        currentLocationLabel = `With agent ${order.agent?.name || ''}`;
      } else {
        const activeMv = itemMovements.find((m) => m.status === 'IN_TRANSIT');
        if (activeMv) {
          currentStatus = 'IN_TRANSIT';
          currentLocationLabel = `In transit to ${
            activeMv.toBranch?.name || 'destination'
          }`;
        } else {
          currentStatus = 'IN_PROGRESS';
          currentLocationLabel = 'Order in progress';
        }
      }

      return {
        item: {
          id: item.id,
          name: item.name,
          count: item.count,
          purity: item.purity,
          imageUrls: item.imageUrls || [],
          grossWeight: item.grossWeight,
          stoneWeight: item.stoneWeight,
          dustWeight: item.dustWeight,
          netWeight: item.netWeight,
          status: item.status,
          currentBranchId: item.currentBranchId,
          createdAt: item.createdAt,
        },
        currentStatus,
        currentLocationLabel,
        currentLocationId,
        timeline,
      };
    });

    // ---- Unified order timeline ----
    const eventKey = (e) =>
      [
        e.stage,
        new Date(e.timestamp).getTime(),
        e.movementId || '',
        e.batchId || '',
        e.location?.id || '',
      ].join('|');

    const eventMap = new Map();
    itemPipelines.forEach(({ item, timeline }) => {
      timeline.forEach((event) => {
        const key = eventKey(event);
        if (!eventMap.has(key)) {
          eventMap.set(key, { ...event, itemIds: [item.id] });
        } else {
          eventMap.get(key).itemIds.push(item.id);
        }
      });
    });

    const orderTimeline = Array.from(eventMap.values())
      .map((e) => ({ ...e, itemCount: e.itemIds.length }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // ---- Stats ----
    const stats = {
      totalItems: order.items.length,
      totalPieces: order.items.reduce((s, i) => s + (i.count || 0), 0),
      totalNet: order.items.reduce((s, i) => s + (i.netWeight || 0), 0),
      totalGross: order.items.reduce((s, i) => s + (i.grossWeight || 0), 0),
      byStatus: {},
    };
    itemPipelines.forEach((p) => {
      stats.byStatus[p.currentStatus] =
        (stats.byStatus[p.currentStatus] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        orderType: order.orderType,
        staff: order.staff,
        // ✅ ADDED — required for the Documents section
        estimateAgreementUrl: order.estimateAgreementUrl,
        purchaseAgreementUrl: order.purchaseAgreementUrl,
        purity: order.purity,
        weight: order.weight,
        finalPrice: order.finalPrice,
        agentOffer: order.agentOffer,
        adminOffer: order.adminOffer,
        estimatedTotal: order.estimatedTotal,
        paymentMode: order.paymentMode,
        comment: order.comment,
        isPledged: order.isPledged,
        pledgeBankName: order.pledgeBankName,
        pledgeLoanAccountNo: order.pledgeLoanAccountNo,
        pledgeOutstandingAmount: order.pledgeOutstandingAmount,
        pledgeDeclarationUrl: order.pledgeDeclarationUrl,
        signedDocumentUrl: order.signedDocumentUrl,
        receiptAcknowledgedAt: order.receiptAcknowledgedAt,
        depositedToBranch: order.depositedToBranch,
        depositedAt: order.depositedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        customer: order.customer,
        agent: order.agent,
        branch: order.branch,
      },
      items: itemPipelines,
      orderTimeline,
      deposit,
      stats,
    });
  } catch (error) {
    console.error('Order pipeline error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}