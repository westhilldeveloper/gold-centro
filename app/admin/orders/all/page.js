'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  ShoppingBagIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  FireIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  UserCircleIcon,
  ArrowPathIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { getSocket } from '@/lib/socket';

const PAGE_SIZE = 20;

const STATUS_CONFIG = {
  // Pending assignment
  OTP_VERIFIED: { label: 'Ready to assign', color: 'bg-emerald-100 text-emerald-700' },
  // In progress
  AGENT_ASSIGNED: { label: 'Agent assigned', color: 'bg-blue-100 text-blue-700' },
  AGENT_ARRIVED: { label: 'Agent arrived', color: 'bg-green-100 text-green-700' },
  AGENT_OFFER_SENT: { label: 'Agent offer sent', color: 'bg-purple-100 text-purple-700' },
  ADMIN_OFFER_SENT: { label: 'Admin offer sent', color: 'bg-orange-100 text-orange-700' },
  NEGOTIATING: { label: 'Negotiating', color: 'bg-yellow-100 text-yellow-700' },
  // Awaiting
  CUSTOMER_PENDING_ACCEPTANCE: { label: 'Customer pending', color: 'bg-indigo-100 text-indigo-700' },
  // Done
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  DEAL_CLOSED: { label: 'Deal closed', color: 'bg-gray-100 text-gray-700' },
  // Closed
  REJECTED_BY_CUSTOMER: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
};

const getStatusCfg = (status) =>
  STATUS_CONFIG[status] || { label: (status || '').replace(/_/g, ' '), color: 'bg-gray-100 text-gray-700' };

export default function AdminAllOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [groups, setGroups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [filtersOpen, setFiltersOpen] = useState(false);

  // ---------- Load ----------
  const load = useCallback(
    async (opts = {}) => {
      const p = opts.page ?? page;
      const useRefreshing = opts.refresh ?? false;
      if (useRefreshing) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: String(PAGE_SIZE),
        });
        if (status && status !== 'ALL') params.set('status', status);
        if (search) params.set('search', search);
        if (from) params.set('from', from);
        if (to) params.set('to', to);

        const res = await fetch(`/api/admin/orders?${params.toString()}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        setOrders(data.orders || []);
        setGroups(data.groups || null);
        const pg = data.pagination || {};
        setPage(pg.page || 1);
        setTotal(pg.total ?? 0);
        setTotalPages(pg.totalPages || 1);
      } catch (err) {
        toast.error('Failed to load orders: ' + err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, status, search, from, to]
  );

  useEffect(() => {
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, from, to]);

    // 👈 1. Use a ref to always hold the latest `load` function
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  // 👈 2. Setup Socket Listeners for real-time updates
  useEffect(() => {
    const socket = getSocket();

    const handleRealtimeUpdate = () => {
      // Silently refresh the current page and stats
      // We use loadRef.current to avoid stale closures
      loadRef.current({ refresh: true });
    };

    // Listen to all events that might affect the orders list
    socket.on('new-order', handleRealtimeUpdate);
    socket.on('order-assigned', handleRealtimeUpdate);
    socket.on('offer-updated', handleRealtimeUpdate);
    socket.on('order-updated', handleRealtimeUpdate);

    return () => {
      socket.off('new-order', handleRealtimeUpdate);
      socket.off('order-assigned', handleRealtimeUpdate);
      socket.off('offer-updated', handleRealtimeUpdate);
      socket.off('order-updated', handleRealtimeUpdate);
    };
  }, []);

  // Debounce the search input → apply on Enter or after 400 ms of inactivity
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const goToPage = (p) => {
    if (p < 1 || p > totalPages || p === page) return;
    setPage(p);
    load({ page: p });
  };

  const clearFilters = () => {
    setStatus('ALL');
    setSearch('');
    setSearchInput('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const hasActiveFilters =
    status !== 'ALL' || search || from || to;

  const formatPrice = (o) =>
    (
      o.finalPrice ||
      o.agentOffer ||
      o.adminOffer ||
      o.estimatedTotal ||
      0
    ).toFixed(2);

  // Compact page number generator
  const pageNumbers = useMemo(() => {
    const t = totalPages;
    const c = page;
    const out = [];
    if (t <= 7) {
      for (let i = 1; i <= t; i++) out.push(i);
    } else if (c <= 4) {
      out.push(1, 2, 3, 4, 5, '...', t);
    } else if (c >= t - 3) {
      out.push(1, '...', t - 4, t - 3, t - 2, t - 1, t);
    } else {
      out.push(1, '...', c - 1, c, c + 1, '...', t);
    }
    return out;
  }, [page, totalPages]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <Toaster position="top-center" />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBagIcon className="w-8 h-8 text-yellow-600" /> All Orders
            </h1>
            <p className="text-gray-500 mt-1">
              Complete order history with status, filters, and drill-through to
              each order's journey
            </p>
          </div>
          <button
            onClick={() => load({ refresh: true })}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Stat cards */}
        {groups && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="Total"
              value={groups.total}
              color="bg-gradient-to-br from-yellow-400 to-amber-500 text-black"
              onClick={() => setStatus('ALL')}
              active={status === 'ALL'}
            />
            <StatCard
              label="Ready to assign"
              value={groups.pendingAssignment}
              color="bg-emerald-50 border border-emerald-200 text-emerald-700"
              onClick={() => setStatus('OTP_VERIFIED')}
              active={status === 'OTP_VERIFIED'}
            />
            <StatCard
              label="In progress"
              value={groups.inProgress}
              color="bg-blue-50 border border-blue-200 text-blue-700"
              onClick={() => setStatus('GROUP_IN_PROGRESS')}
              active={status === 'GROUP_IN_PROGRESS'}
            />
            <StatCard
              label="Awaiting customer"
              value={groups.awaitingCustomer}
              color="bg-indigo-50 border border-indigo-200 text-indigo-700"
              onClick={() => setStatus('CUSTOMER_PENDING_ACCEPTANCE')}
              active={status === 'CUSTOMER_PENDING_ACCEPTANCE'}
            />
            <StatCard
              label="Completed"
              value={groups.completed}
              color="bg-green-50 border border-green-200 text-green-700"
              onClick={() => setStatus('GROUP_COMPLETED')}
              active={status === 'GROUP_COMPLETED'}
            />
            <StatCard
              label="Rejected"
              value={groups.closed}
              color="bg-red-50 border border-red-200 text-red-700"
              onClick={() => setStatus('GROUP_CLOSED')}
              active={status === 'GROUP_CLOSED'}
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 space-y-3">
          {/* Row 1: search + filter toggle */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by order #, customer, phone, or agent…"
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-yellow-500 outline-none"
              />
            </div>

            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border-2 transition ${
                filtersOpen
                  ? 'border-yellow-400 bg-yellow-50 text-yellow-800'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-4 h-4" /> Filters
              {hasActiveFilters && (
                <span className="ml-1 text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-full font-bold">
                  ON
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 font-medium px-3 py-2"
              >
                <XMarkIcon className="w-4 h-4" /> Clear
              </button>
            )}
          </div>

          {/* Row 2: expanded filters */}
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-gray-100"
            >
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-yellow-500 outline-none text-sm"
                >
                  <option value="ALL">All statuses</option>
                  <optgroup label="Groups">
                    <option value="GROUP_IN_PROGRESS">In progress (any)</option>
                    <option value="GROUP_COMPLETED">Completed</option>
                    <option value="GROUP_CLOSED">Rejected</option>
                  </optgroup>
                  <optgroup label="Specific">
                    <option value="OTP_VERIFIED">Ready to assign</option>
                    <option value="AGENT_ASSIGNED">Agent assigned</option>
                    <option value="AGENT_ARRIVED">Agent arrived</option>
                    <option value="AGENT_OFFER_SENT">Agent offer sent</option>
                    <option value="ADMIN_OFFER_SENT">Admin offer sent</option>
                    <option value="NEGOTIATING">Negotiating</option>
                    <option value="CUSTOMER_PENDING_ACCEPTANCE">
                      Customer pending
                    </option>
                    <option value="COMPLETED">Completed</option>
                    <option value="DEAL_CLOSED">Deal closed</option>
                    <option value="REJECTED_BY_CUSTOMER">Rejected</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-yellow-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-yellow-500 outline-none text-sm"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBagIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {hasActiveFilters
                  ? 'No orders match the current filters.'
                  : 'No orders yet.'}
              </p>
            </div>
          ) : (
            <>
              {/* Header row (desktop only) */}
              <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                <div className="col-span-3">Order / Customer</div>
                <div className="col-span-2">Agent</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-3 text-right">Date / Action</div>
              </div>

              <div className="divide-y divide-gray-100">
                {orders.map((o, idx) => {
                  const cfg = getStatusCfg(o.status);
                  return (
                    <motion.button
                      key={o.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(idx * 0.015, 0.2) }}
                      onClick={() => router.push(`/admin/orders/${o.id}`)}
                      className="w-full text-left px-6 py-4 hover:bg-yellow-50/40 transition group grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                    >
                      {/* Order + Customer */}
                      <div className="md:col-span-3 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500">
                            #{o.id.slice(-8).toUpperCase()}
                          </span>
                          {o.isPledged && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-medium">
                              🔒
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate mt-0.5">
                          {o.customer?.name || '—'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {o.customer?.phone || ''}
                        </p>
                      </div>

                      {/* Agent */}
                    
                      {/* Agent / Staff */}
                      <div className="md:col-span-2 min-w-0">
                        <p className="text-xs text-gray-500">
                          {o.orderType === 'BRANCH_DIRECT' ? 'Staff' : 'Agent'}
                        </p>
                        <p className="text-sm text-gray-900 truncate">
                          {o.orderType === 'BRANCH_DIRECT' 
                            ? (o.staff?.name || '—') 
                            : (o.agent?.name || <span className="text-gray-400 italic">Not assigned</span>)}
                        </p>
                        {(o.orderType === 'BRANCH_DIRECT' ? o.staff?.phone : o.agent?.phone) && (
                          <p className="text-[11px] text-gray-500 truncate">
                            {o.orderType === 'BRANCH_DIRECT' ? o.staff.phone : o.agent.phone}
                          </p>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="md:col-span-2 min-w-0">
                        <p className="text-xs text-gray-500">Net · Amount</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {(o.weight || 0).toFixed(2)}g
                          {o.purity && (
                            <span className="text-[11px] text-gray-500 font-normal ml-1">
                              ({o.purity})
                            </span>
                          )}
                        </p>
                        <p className="text-sm font-bold text-green-700">
                          ₹{formatPrice(o)}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="md:col-span-2">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                        {o._count?.items > 0 && (
                          <p className="text-[10px] text-gray-500 mt-1">
                            {o._count.items} item
                            {o._count.items > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>

                      {/* Date + arrow */}
                      <div className="md:col-span-3 md:text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(o.createdAt).toLocaleString()}
                        </p>
                        {o.branch && (
                          <p className="text-[11px] text-gray-500 truncate">
                            🏦 {o.branch.name}
                          </p>
                        )}
                        <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-blue-600 group-hover:text-blue-800 font-medium mt-1">
                          View journey
                          <ChevronRightIcon className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Showing{' '}
              <strong>
                {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, total)}
              </strong>{' '}
              of <strong>{total}</strong> orders
            </p>

            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-4 h-4" /> Prev
              </button>

              {pageNumbers.map((p, i) =>
                p === '...' ? (
                  <span
                    key={`e-${i}`}
                    className="px-2 py-2 text-sm text-gray-400 select-none"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`min-w-[38px] px-3 py-2 rounded-lg text-sm font-medium transition ${
                      p === page
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-sm'
                        : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------ Stat card ------------------ */
function StatCard({ label, value, color, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl p-4 transition ${color} ${
        active ? 'ring-2 ring-offset-1 ring-yellow-400' : ''
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
        {label}
      </p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </button>
  );
}