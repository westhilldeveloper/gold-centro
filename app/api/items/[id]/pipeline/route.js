// D:\gold-centro\app\api\items\[id]\pipeline\route.js
import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const item = await prisma.orderItem.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            agent: {
              select: { id: true, name: true, phone: true, branchId: true },
            },
            branch: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    const order = item.order;

    // ---- Parallel fetch of everything tied to this item ----
    const [deposit, movements, meltingBatch] = await Promise.all([
      prisma.agentDeposit.findFirst({
        where: { orderIds: { has: order.id } },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          agent: { select: { id: true, name: true } },
        },
        orderBy: { depositedAt: 'asc' },
      }),
      prisma.stockMovement.findMany({
        where: { itemIds: { has: item.id } },
        include: {
          fromBranch: { select: { id: true, name: true, code: true } },
          toBranch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.meltingBatch.findFirst({
        where: { itemIds: { has: item.id } },
        include: { branch: { select: { id: true, name: true, code: true } } },
      }),
    ]);

    let batchBars = [];
    if (meltingBatch) {
      batchBars = await prisma.goldBar.findMany({
        where: { batchId: meltingBatch.id },
      });
    }

    // ---- Siblings: items that travelled / melted with this one ----
    // 1) Movement siblings — items in the same StockMovement rows
    const movementSiblingIds = new Set();
    movements.forEach((m) => {
      (m.itemIds || []).forEach((sibId) => {
        if (sibId !== item.id) movementSiblingIds.add(sibId);
      });
    });

    // 2) Melting siblings — items in the same MeltingBatch
    const meltingSiblingIds = new Set();
    if (meltingBatch) {
      (meltingBatch.itemIds || []).forEach((sibId) => {
        if (sibId !== item.id) meltingSiblingIds.add(sibId);
      });
    }

    const allSiblingIds = Array.from(
      new Set([...movementSiblingIds, ...meltingSiblingIds])
    );

    let siblings = [];
    if (allSiblingIds.length > 0) {
      const sibItems = await prisma.orderItem.findMany({
        where: { id: { in: allSiblingIds } },
        select: {
          id: true,
          name: true,
          count: true,
          netWeight: true,
          purity: true,
          orderId: true,
          status: true,
          order: {
            select: {
              id: true,
              purity: true,
              customer: { select: { name: true } },
            },
          },
        },
      });

      siblings = sibItems.map((s) => ({
        id: s.id,
        name: s.name,
        count: s.count,
        netWeight: s.netWeight,
        purity: s.purity || s.order?.purity,
        orderId: s.orderId,
        orderShortId: s.orderId.slice(-8).toUpperCase(),
        customerName: s.order?.customer?.name || null,
        status: s.status,
        viaMovement: movementSiblingIds.has(s.id),
        viaMelting: meltingSiblingIds.has(s.id),
      }));
    }

    let currentBranch = null;
if (item.currentBranchId) {
  currentBranch = await prisma.branch.findUnique({
    where: { id: item.currentBranchId },
    select: { id: true, name: true, code: true },
  });
}

// ✅ NEW: fetch carrier agent if this item is being carried
let currentCarrierAgent = null;
if (item.currentAgentId) {
  currentCarrierAgent = await prisma.user.findUnique({
    where: { id: item.currentAgentId },
    select: { id: true, name: true, phone: true },
  });
}
    // ---- Status flags (compute before using) ----
    const inTransit = movements.find((m) => m.status === 'IN_TRANSIT');
    const inMelting =
      meltingBatch && ['PENDING', 'IN_PROGRESS'].includes(meltingBatch.status);
    const melted =
      (meltingBatch && meltingBatch.status === 'COMPLETED') ||
      item.status === 'MELTED';
    const meltingCancelled =
      meltingBatch && meltingBatch.status === 'CANCELLED';

    // =========================================================
    // BUILD TIMELINE
    // =========================================================
    const timeline = [];

    // 1. Item recorded
    timeline.push({
      stage: 'RECORDED',
      label: 'Item Recorded',
      description: `Added by ${order.agent?.name || 'Agent'} during customer visit`,
      timestamp: item.createdAt,
      actor: order.agent ? { name: order.agent.name, role: 'AGENT' } : null,
      location: null,
      icon: 'document',
      color: 'blue',
    });

    // 2. Order completed / in progress
    if (order.status === 'COMPLETED') {
      timeline.push({
        stage: 'PURCHASED',
        label: 'Purchase Completed',
        description: `Price: ₹${(
          order.finalPrice ||
          order.agentOffer ||
          0
        ).toFixed(2)} • Payment: ${order.paymentMode || 'N/A'}`,
        timestamp: order.updatedAt,
        actor: order.customer
          ? { name: order.customer.name, role: 'CUSTOMER' }
          : null,
        location: null,
        icon: 'check',
        color: 'green',
      });
    } else {
      timeline.push({
        stage: 'IN_PROGRESS',
        label: `Order ${order.status.replace(/_/g, ' ')}`,
        description: 'Order is being processed',
        timestamp: order.updatedAt,
        actor: null,
        location: null,
        icon: 'clock',
        color: 'yellow',
      });
    }

    // 3. Deposit to first branch
    if (deposit) {
      timeline.push({
        stage: 'DEPOSITED',
        label: `Deposited at ${deposit.branch?.name || 'Branch'}`,
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

    // 3.5 ✅ NEW: Agent carrier event (item picked up by agent)
if (currentCarrierAgent && currentCarrierAgent.id !== order.agentId) {
  // Only add if it's a different agent than the buyer — this is a
  // specific handoff event during transit
  timeline.push({
    stage: 'CARRIER_PICKUP',
    label: `Carried by ${currentCarrierAgent.name}`,
    description: `Agent is delivering this item to another branch`,
    timestamp: item.updatedAt || new Date(),
    actor: { name: currentCarrierAgent.name, role: 'CARRIER' },
    location: null,
    icon: 'truck',
    color: 'orange',
  });
}
    // 4. Movements — SENT + RECEIVED/IN_TRANSIT/CANCELLED
    movements.forEach((m) => {
      const fromName = m.fromBranch?.name || 'External';
      const toName = m.toBranch?.name || 'External';
      const otherItemsInMovement = (m.itemIds || []).length - 1;

      // Build a rich description with people chain
      const descParts = [`Dispatched to ${toName}`];
      if (m.handedOverByName) {
        descParts.push(`Handed over by ${m.handedOverByName}`);
      }
      if (m.carrierName) {
        descParts.push(
          `Carried by ${m.carrierName}${
            m.carrierPhone ? ` (${m.carrierPhone})` : ''
          }`
        );
      }
      if (otherItemsInMovement > 0) {
        descParts.push(
          `+${otherItemsInMovement} other item${
            otherItemsInMovement > 1 ? 's' : ''
          }`
        );
      }

      // Inside `movements.forEach((m) => { ... })`
timeline.push({
  stage: 'SENT',
  label: `Sent from ${fromName}`,
  description: descParts.join(' • '),
  timestamp: m.createdAt,
  actor: m.carrierName
    ? { name: m.carrierName, role: m.carrierType || 'CARRIER' }
    : m.handedOverByName
    ? { name: m.handedOverByName, role: 'HANDOVER' }
    : null,
  location: m.fromBranch,
  icon: 'truck',
  color: 'yellow',
  movementId: m.id,
  // ✅ CHANGED: from handoverSheetUrl → transferNoteUrl
  transferNoteUrl: m.transferNoteUrl || null,
  siblingCount: otherItemsInMovement,
});

      if (m.status === 'RECEIVED' && m.receivedAt) {
  timeline.push({
    stage: 'RECEIVED',
    label: `Received at ${toName}`,
    description: m.receivedByName
      ? `Received by ${m.receivedByName} from ${fromName}`
      : `Confirmed from ${fromName}`,
    timestamp: m.receivedAt,
    actor: m.receivedByName
      ? { name: m.receivedByName, role: 'RECEIVER' }
      : null,
    location: m.toBranch,
    icon: 'check',
    color: 'green',
    movementId: m.id,
    // ✅ NEW: receiving note URL
    receivingNoteUrl: m.receivingNoteUrl || null,
  });

      } else if (m.status === 'CANCELLED') {
        timeline.push({
          stage: 'CANCELLED',
          label: 'Movement Cancelled',
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
          stage: 'IN_TRANSIT',
          label: `In Transit to ${toName}`,
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

    // 5. Melting events
    if (meltingBatch) {
      const meltingSiblingCount = (meltingBatch.itemIds || []).length - 1;
      const meltDescParts = [
        `Batch at ${meltingBatch.branch?.name || 'branch'}`,
        `Input ${meltingBatch.totalInputWeight.toFixed(2)}g`,
      ];
      if (meltingSiblingCount > 0) {
        meltDescParts.push(
          `With ${meltingSiblingCount} other item${
            meltingSiblingCount > 1 ? 's' : ''
          }`
        );
      }

      timeline.push({
        stage: 'SENT_TO_MELTING',
        label: `Sent for Melting (${meltingBatch.batchCode})`,
        description: meltDescParts.join(' • '),
        timestamp: meltingBatch.sentAt,
        actor: null,
        location: meltingBatch.branch,
        icon: 'fire',
        color: 'orange',
        batchId: meltingBatch.id,
        batchCode: meltingBatch.batchCode,
        siblingCount: meltingSiblingCount,
      });

      if (meltingBatch.status === 'COMPLETED' && meltingBatch.completedAt) {
        const barSummary = batchBars
          .map((b) => `${b.barCode} (${b.weight.toFixed(2)}g)`)
          .join(', ');
        timeline.push({
          stage: 'MELTED',
          label: `Melted into ${batchBars.length} bar${
            batchBars.length > 1 ? 's' : ''
          }`,
          description: barSummary || 'Completed',
          timestamp: meltingBatch.completedAt,
          actor: null,
          location: meltingBatch.branch,
          icon: 'bars',
          color: 'green',
          batchId: meltingBatch.id,
          barIds: batchBars.map((b) => b.id),
          siblingCount: meltingSiblingCount,
        });
      } else if (
        meltingBatch.status === 'IN_PROGRESS' ||
        meltingBatch.status === 'PENDING'
      ) {
        timeline.push({
          stage: 'MELTING_IN_PROGRESS',
          label: 'Melting in Progress',
          description: 'Batch is being processed',
          timestamp: new Date(),
          actor: null,
          location: meltingBatch.branch,
          icon: 'fire',
          color: 'orange',
          batchId: meltingBatch.id,
          siblingCount: meltingSiblingCount,
        });
      } else if (meltingBatch.status === 'CANCELLED') {
        timeline.push({
          stage: 'MELTING_CANCELLED',
          label: 'Melting Cancelled',
          description: 'Batch was cancelled — item returned to source branch',
          timestamp: meltingBatch.updatedAt,
          actor: null,
          location: meltingBatch.branch,
          icon: 'x',
          color: 'red',
          batchId: meltingBatch.id,
        });
      }
    }

    // 6. Current location (always last)
    let currentStage = null;

    if (melted) {
      currentStage = {
        stage: 'CURRENT_MELTED',
        label: `Melted into ${batchBars.length} bar${
          batchBars.length > 1 ? 's' : ''
        }`,
        description: batchBars
          .map((b) => `${b.barCode} • ${b.weight.toFixed(2)}g • ${b.purity}`)
          .join(' | '),
        timestamp: meltingBatch?.completedAt || new Date(),
        actor: null,
        location: meltingBatch?.branch || null,
        icon: 'bars',
        color: 'green',
      };
    } else if (inMelting) {
      currentStage = {
        stage: 'CURRENT_MELTING',
        label: `In melting (${meltingBatch.batchCode})`,
        description: 'Being processed',
        timestamp: new Date(),
        actor: null,
        location: meltingBatch.branch,
        icon: 'fire',
        color: 'orange',
      };
    } else if (currentBranch) {
      currentStage = {
        stage: 'CURRENT',
        label: `Currently at ${currentBranch.name}`,
        description: 'Item is stored here now',
        timestamp: new Date(),
        actor: null,
        location: currentBranch,
        icon: 'building',
        color: 'green',
      };
      
    } 
    else if (currentCarrierAgent) {
  currentStage = {
    stage: 'CURRENT_CARRIER',
    label: `Being carried by ${currentCarrierAgent.name}`,
    description: 'In transit between branches',
    timestamp: new Date(),
    actor: { name: currentCarrierAgent.name, role: 'CARRIER' },
    location: null,
    icon: 'truck',
    color: 'orange',
  };
}
    else if (inTransit) {
      currentStage = {
        stage: 'CURRENT_IN_TRANSIT',
        label: `In transit to ${
          inTransit.toBranch?.name || 'destination'
        }`,
        description: 'On the way',
        timestamp: new Date(),
        actor: null,
        location: inTransit.toBranch,
        icon: 'truck',
        color: 'yellow',
      };
    }

    // Sort history by timestamp, then append CURRENT
    timeline.sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    const finalTimeline = currentStage ? [...timeline, currentStage] : timeline;

    // =========================================================
    // Current status label
    // =========================================================
    let currentStatus = 'UNKNOWN';
let currentLocationLabel = 'Unknown';

if (melted) {
  currentStatus = 'MELTED';
  const barList = batchBars
    .map((b) => `${b.barCode} (${b.weight.toFixed(2)}g)`)
    .join(', ');
  currentLocationLabel = barList
    ? `Melted into bars: ${barList}`
    : `Melted (${meltingBatch?.batchCode || 'batch'})`;
} else if (inMelting) {
  currentStatus = 'IN_MELTING';
  currentLocationLabel = `In melting (${meltingBatch.batchCode}) at ${
    meltingBatch.branch?.name || 'branch'
  }`;
} else if (meltingCancelled && item.currentBranchId) {
  currentStatus = 'AT_BRANCH';
  currentLocationLabel = `At ${currentBranch?.name || 'branch'}`;
} else if (inTransit) {
  currentStatus = 'IN_TRANSIT';
  currentLocationLabel = `In transit to ${
    inTransit.toBranch?.name || 'destination'
  }`;
} else if (currentBranch) {
  currentStatus = 'AT_BRANCH';
  currentLocationLabel = `At ${currentBranch.name}`;
} else if (currentCarrierAgent) {
  // ✅ NEW: being carried by an agent
  currentStatus = 'WITH_AGENT_CARRIER';
  currentLocationLabel = `Being carried by ${currentCarrierAgent.name}`;
} else if (order.status === 'COMPLETED' && !order.depositedToBranch) {
  currentStatus = 'WITH_AGENT';
  currentLocationLabel = `With agent ${order.agent?.name || ''}`;
} else {
  currentStatus = 'IN_PROGRESS';
  currentLocationLabel = 'Order in progress';
}

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        name: item.name,
        count: item.count,
        imageUrls: item.imageUrls || [],
        grossWeight: item.grossWeight,
        stoneWeight: item.stoneWeight,
        dustWeight: item.dustWeight,
        netWeight: item.netWeight,
        purity: item.purity || order.purity,
        orderId: order.id,
        orderStatus: order.status,
        customer: order.customer,
        agent: order.agent,
        paymentMode: order.paymentMode,
        finalPrice: order.finalPrice || order.agentOffer,
        createdAt: item.createdAt,
        itemStatus: item.status,
        currentBranchId: item.currentBranchId,
        currentAgentId: item.currentAgentId, 
      },
      currentStatus,
      currentLocationLabel,
      currentBranch,
      currentCarrierAgent,
      meltingBatch: meltingBatch
        ? {
            id: meltingBatch.id,
            batchCode: meltingBatch.batchCode,
            status: meltingBatch.status,
            purity: meltingBatch.purity,
            totalInputWeight: meltingBatch.totalInputWeight,
            totalBarWeight: meltingBatch.totalBarWeight,
            sentAt: meltingBatch.sentAt,
            completedAt: meltingBatch.completedAt,
          }
        : null,
      bars: batchBars.map((b) => ({
        id: b.id,
        barCode: b.barCode,
        purity: b.purity,
        weight: b.weight,
        imageUrl: b.imageUrl,
        createdAt: b.createdAt,
      })),
      siblings,
      timeline: finalTimeline,
    });
  } catch (error) {
    console.error('Item pipeline error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}