// D:\gold-centro\app\api\admin\orders\route.js
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    // ---- Pagination ----
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(
      searchParams.get('limit') || String(DEFAULT_PAGE_SIZE),
      10
    );
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const pageSize =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    // ---- Filters ----
    const status = searchParams.get('status') || '';
    const search = (searchParams.get('search') || '').trim();
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const agentId = searchParams.get('agentId') || '';
    const branchId = searchParams.get('branchId') || '';

    const where = {};

    if (status && status !== 'ALL') {
      if (status === 'GROUP_IN_PROGRESS') {
        where.status = {
          in: [
            'AGENT_ASSIGNED',
            'AGENT_ARRIVED',
            'AGENT_OFFER_SENT',
            'ADMIN_OFFER_SENT',
            'NEGOTIATING',
          ],
        };
      } else if (status === 'GROUP_COMPLETED') {
        where.status = { in: ['COMPLETED', 'DEAL_CLOSED'] };
      } else if (status === 'GROUP_CLOSED') {
        where.status = { in: ['REJECTED_BY_CUSTOMER'] };
      } else {
        where.status = status;
      }
    }

    if (agentId) where.agentId = agentId;
    if (branchId) where.branchId = branchId;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    if (search) {
      // Search by order id, customer name, customer phone, agent name
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search } } },
        { agent: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // ---- Fetch in parallel with counts ----
    const [orders, total, statusCounts] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          status: true,
          orderType: true,
          weight: true,
          purity: true,
          estimatedTotal: true,
          agentOffer: true,
          adminOffer: true,
          finalPrice: true,
          paymentMode: true,
          isPledged: true,
          depositedToBranch: true,
          depositedAt: true,
          receiptAcknowledgedAt: true,
          createdAt: true,
          updatedAt: true,
          customer: { select: { id: true, name: true, phone: true } },
          agent: { select: { id: true, name: true, phone: true } },
          staff: { select: { id: true, name: true, phone: true } },
          branch: { select: { id: true, name: true, code: true } },
          _count: { select: { items: true } },
        },
      }),

      prisma.order.count({ where }),

      // Counts by logical group (unfiltered, for stat cards)
      prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    // Collapse raw status counts into logical groups
    const groups = {
      pendingAssignment: 0,
      inProgress: 0,
      awaitingCustomer: 0,
      completed: 0,
      closed: 0,
      total: 0,
    };
    statusCounts.forEach((row) => {
      const n = row._count._all;
      groups.total += n;
      switch (row.status) {
        case 'OTP_VERIFIED':
          groups.pendingAssignment += n;
          break;
        case 'AGENT_ASSIGNED':
        case 'AGENT_ARRIVED':
        case 'AGENT_OFFER_SENT':
        case 'ADMIN_OFFER_SENT':
        case 'NEGOTIATING':
          groups.inProgress += n;
          break;
        case 'CUSTOMER_PENDING_ACCEPTANCE':
          groups.awaitingCustomer += n;
          break;
        case 'COMPLETED':
        case 'DEAL_CLOSED':
          groups.completed += n;
          break;
        case 'REJECTED_BY_CUSTOMER':
          groups.closed += n;
          break;
        default:
          break;
      }
    });

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      success: true,
      orders,
      groups,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Admin all orders error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}