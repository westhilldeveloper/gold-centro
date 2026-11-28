// D:\gold-centro\app\branch\orders\page.js
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  ShoppingBagIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PhotoIcon,
  UserCircleIcon,
  DocumentTextIcon,
  CurrencyRupeeIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  BuildingLibraryIcon,
  CreditCardIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import ItemImageCarousel, {
  getImageUrls,
} from '../../components/ItemImageCarousel';

const PAGE_SIZE = 20;

// ✅ Updated Status Styles to Outlined/Border variants
const STATUS_STYLES = {
  AGENT_ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
  AGENT_ARRIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  AGENT_OFFER_SENT: 'bg-purple-50 text-purple-700 border-purple-200',
  ADMIN_OFFER_SENT: 'bg-orange-50 text-orange-700 border-orange-200',
  NEGOTIATING: 'bg-amber-50 text-amber-700 border-amber-200',
  CUSTOMER_PENDING_ACCEPTANCE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200',
  REJECTED_BY_CUSTOMER: 'bg-red-50 text-red-700 border-red-200',
  DEAL_CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
  OTP_VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_AGREEMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_ESTIMATE_AGREEMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_POST_ESTIMATION: 'bg-orange-50 text-orange-700 border-orange-200',
  PENDING_PURCHASE_AGREEMENT: 'bg-purple-50 text-purple-700 border-purple-200',
  PENDING_PAYMENT: 'bg-blue-50 text-blue-700 border-blue-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

const statusLabel = (s) =>
  (s || 'UNKNOWN').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const PAYMENT_ICONS = {
  CASH: BanknotesIcon,
  BANK_TRANSFER: BuildingLibraryIcon,
  UPI: CreditCardIcon,
  CHEQUE: DocumentTextIcon,
};

export default function BranchOrders() {
  const { user } = useAuth();

  // List
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Preview + detail
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState(true);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ---------- Load list ----------
  const loadPage = useCallback(
    async (p = 1) => {
      if (!user?.branchId) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          branchId: user.branchId,
          page: p,
          limit: PAGE_SIZE,
        });
        if (debouncedSearch) params.append('search', debouncedSearch);

        const res = await fetch(`/api/branch/orders?${params.toString()}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        
        setOrders(data.orders || []);
        const pg = data.pagination || {};
        setPage(pg.page || 1);
        setTotal(pg.total ?? (data.orders?.length || 0));
        setTotalPages(pg.totalPages || 1);
      } catch (err) {
        toast.error('Failed to load orders: ' + err.message);
      } finally {
        setLoading(false);
      }
    },
    [user?.branchId, debouncedSearch]
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const goToPage = (p) => {
    if (p < 1 || p > totalPages || p === page) return;
    loadPage(p);
  };

  // ---------- Detail ----------
  const openDetail = async (order) => {
    setSelectedOrder(order);
    setOrderDetail(null);
    setDetailLoading(true);
    setExpandedItems(true);
    try {
      const res = await fetch(`/api/branch/orders/${order.id}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setOrderDetail(data.order);
    } catch (err) {
      toast.error('Failed to load order: ' + err.message);
      setSelectedOrder(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedOrder(null);
    setOrderDetail(null);
  };

  // ---------- Derived summaries for detail modal ----------
  const detailSummary = useMemo(() => {
    if (!orderDetail) return null;
    const items = orderDetail.items || [];
    const totalNet = items.reduce((s, i) => s + (i.netWeight || 0), 0);
    const totalGross = items.reduce((s, i) => s + (i.grossWeight || 0), 0);
    const totalPieces = items.reduce((s, i) => s + (i.count || 0), 0);
    const byPurity = {};
    items.forEach((i) => {
      const p = i.purity || 'Unknown';
      if (!byPurity[p]) byPurity[p] = { count: 0, pieces: 0, net: 0 };
      byPurity[p].count += 1;
      byPurity[p].pieces += i.count || 0;
      byPurity[p].net += i.netWeight || 0;
    });
    return { totalNet, totalGross, totalPieces, byPurity, itemCount: items.length };
  }, [orderDetail]);

  // ---------- Pagination page numbers ----------
  const pageNumbers = () => {
    const t = totalPages;
    const c = page;
    const out = [];
    const push = (n) => out.push(n);

    if (t <= 7) {
      for (let i = 1; i <= t; i++) push(i);
    } else if (c <= 4) {
      [1, 2, 3, 4, 5].forEach(push);
      push('...');
      push(t);
    } else if (c >= t - 3) {
      push(1);
      push('...');
      [t - 4, t - 3, t - 2, t - 1, t].forEach(push);
    } else {
      push(1);
      push('...');
      [c - 1, c, c + 1].forEach(push);
      push('...');
      push(t);
    }
    return out;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBagIcon className="w-7 h-7 text-slate-400" /> Branch Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {total} order{total !== 1 ? 's' : ''} handled by this branch
          </p>
        </div>
        {totalPages > 1 && (
          <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2">
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-transparent border-none focus:ring-0 outline-none text-sm text-slate-900 placeholder-slate-400"
          />
        </div>
      </div>

      {/* List */}
      {loading && orders.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
          <ShoppingBagIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-700">
            {debouncedSearch ? 'No orders found matching your search.' : 'No orders recorded yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading && (
            <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              Refreshing…
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {orders.map((o) => {
              const st = STATUS_STYLES[o.status] || 'bg-slate-100 text-slate-700 border-slate-200';
              const itemCount = o.items?.length || 0;
              const isDirect = o.orderType === 'BRANCH_DIRECT';

              return (
                <motion.button
                  key={o.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => openDetail(o)}
                  className="w-full text-left px-6 py-5 hover:bg-slate-50/80 transition-colors group"
                >
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="flex gap-4 min-w-0 flex-1">
                      {/* Tiny thumbnail */}
                      {(() => {
                        const first = getImageUrls(o.items?.[0])[0];
                        return (
                          <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                            {first ? (
                              <img src={first} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <PhotoIcon className="w-6 h-6 text-slate-300" />
                            )}
                          </div>
                        );
                      })()}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-mono text-[11px] text-slate-400">
                            #{o.id.slice(-8).toUpperCase()}
                          </p>
                          {isDirect && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                              Direct Purchase
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
                          {o.customer?.name || '—'}
                          {o.customer?.phone && (
                            <span className="text-slate-500 font-normal ml-1.5">
                              ({o.customer.phone})
                            </span>
                          )}
                        </p>
                        
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isDirect ? 'Staff' : 'Agent'}:{' '}
                          <span className="font-medium text-slate-700">
                            {isDirect ? (o.staff?.name || '—') : (o.agent?.name || 'N/A')}
                          </span>
                          {itemCount > 0 && (
                            <span className="ml-1.5 text-slate-400">
                              • {itemCount} item{itemCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {new Date(o.createdAt).toLocaleString('en-GB')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                      <p className="font-bold text-slate-900 text-sm">
                        {o.weight?.toFixed(3)}g{' '}
                        <span className="text-xs text-slate-500 font-medium">
                          ({o.purity})
                        </span>
                      </p>
                      <p className="text-sm text-slate-900 font-semibold">
                        ₹{(o.finalPrice || o.agentOffer || o.estimatedTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border ${st}`}>
                          {statusLabel(o.status)}
                        </span>
                        <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" /> Prev
          </button>

          {pageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`e-${idx}`} className="px-2 py-1.5 text-sm text-slate-400 select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={`min-w-[36px] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ---------- Detail modal ---------- */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={closeDetail}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <ShoppingBagIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-900">
                      Order Details
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-500 font-mono">
                        #{selectedOrder.id.slice(-8).toUpperCase()}
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                        orderDetail?.orderType === 'BRANCH_DIRECT' 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {orderDetail?.orderType === 'BRANCH_DIRECT' ? 'Direct Purchase' : 'Agent Purchase'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeDetail}
                  className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-2 rounded-lg border border-slate-200 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {detailLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !orderDetail ? (
                  <p className="text-center text-slate-500 py-8">
                    No detail available.
                  </p>
                ) : (
                  <>
                    {/* Status + price cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-1">Net Weight</p>
                        <p className="text-xl font-bold text-slate-900">
                          {(orderDetail.weight || 0).toFixed(3)}<span className="text-sm font-normal text-slate-500">g</span>
                        </p>
                      </div>
                      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-1">Purity</p>
                        <p className="text-xl font-bold text-slate-900">
                          {orderDetail.purity || '—'}
                        </p>
                      </div>
                      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 border-l-4 border-l-emerald-500">
                        <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-bold mb-1">Final Price</p>
                        <p className="text-xl font-bold text-slate-900">
                          ₹{(orderDetail.finalPrice || orderDetail.agentOffer || orderDetail.estimatedTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Status bar */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wide border ${
                          STATUS_STYLES[orderDetail.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                        {statusLabel(orderDetail.status)}
                      </span>
                      {orderDetail.isPledged && (
                        <span className="text-[11px] bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-md font-bold uppercase tracking-wide">
                          🔒 Pledged
                        </span>
                      )}
                      {orderDetail.orderType === 'BRANCH_DIRECT' && orderDetail.cancelledAt && (
                        <span className="text-[11px] bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-md font-bold uppercase tracking-wide">
                          Cancelled: {orderDetail.cancelReason || 'No reason'}
                        </span>
                      )}
                    </div>

                    {/* Customer + Agent/Staff */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center gap-2 mb-1.5">
                          <UserCircleIcon className="w-4 h-4 text-slate-500" />
                          <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Customer</p>
                        </div>
                        <p className="font-semibold text-slate-900 text-sm">{orderDetail.customer?.name || '—'}</p>
                        {orderDetail.customer?.phone && <p className="text-xs text-slate-500 mt-0.5">{orderDetail.customer.phone}</p>}
                        {orderDetail.customer?.aadhaarNumber && (
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">Aadhaar: •••• {orderDetail.customer.aadhaarNumber.slice(-4)}</p>
                        )}
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center gap-2 mb-1.5">
                          <UserCircleIcon className="w-4 h-4 text-slate-500" />
                          <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">{orderDetail.orderType === 'BRANCH_DIRECT' ? 'Staff' : 'Agent'}</p>
                        </div>
                        <p className="font-semibold text-slate-900 text-sm">
                          {orderDetail.orderType === 'BRANCH_DIRECT' ? (orderDetail.staff?.name || '—') : (orderDetail.agent?.name || '—')}
                        </p>
                        {(orderDetail.orderType === 'BRANCH_DIRECT' ? orderDetail.staff?.phone : orderDetail.agent?.phone) && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {orderDetail.orderType === 'BRANCH_DIRECT' ? orderDetail.staff.phone : orderDetail.agent.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price breakdown */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-2 text-sm">
                      {orderDetail.estimatedTotal != null && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Estimated</span>
                          <span className="font-medium text-slate-800">₹{orderDetail.estimatedTotal.toFixed(2)}</span>
                        </div>
                      )}
                      {orderDetail.agentOffer != null && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Agent Offer</span>
                          <span className="font-medium text-slate-800">₹{orderDetail.agentOffer.toFixed(2)}</span>
                        </div>
                      )}
                      {orderDetail.adminOffer != null && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Admin Offer</span>
                          <span className="font-medium text-slate-800">₹{orderDetail.adminOffer.toFixed(2)}</span>
                        </div>
                      )}
                      {orderDetail.finalPrice != null && (
                        <div className="flex justify-between pt-2 mt-1 border-t border-slate-200">
                          <span className="text-slate-900 font-bold">Final Price</span>
                          <span className="font-bold text-emerald-600">₹{orderDetail.finalPrice.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* PAYMENT DETAILS (Direct Purchases) */}
                    {orderDetail.orderType === 'BRANCH_DIRECT' && (orderDetail.paymentMode || orderDetail.paymentDetails) && (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                          <CurrencyRupeeIcon className="w-4 h-4 text-slate-500" /> Payment Details
                        </p>
                        
                        <div className="flex justify-between text-sm pt-1">
                          <span className="text-slate-500">Mode</span>
                          <span className="font-semibold flex items-center gap-1 text-slate-900">{orderDetail.paymentMode}</span>
                        </div>

                        {orderDetail.paymentReference && (
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-slate-500">Reference</span>
                            <span className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">{orderDetail.paymentReference}</span>
                          </div>
                        )}

                        {orderDetail.paymentDetails && (
                          <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                            {Object.entries(orderDetail.paymentDetails).map(([k, v]) => (
                              <div key={k} className="flex justify-between text-xs">
                                <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                <span className="font-medium text-slate-700">{v}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* DOCUMENTS (Direct Purchases) */}
                    {orderDetail.orderType === 'BRANCH_DIRECT' && (
                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Documents</p>
                        <div className="flex flex-col gap-2">
                          {orderDetail.estimateAgreementUrl ? (
                            <a
                              href={orderDetail.estimateAgreementUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition font-medium"
                            >
                              <DocumentTextIcon className="w-4 h-4 text-slate-500" /> 1. Signed Estimate Agreement
                              <ArrowDownTrayIcon className="w-4 h-4 ml-auto text-slate-400" />
                            </a>
                          ) : (
                            <span className="text-sm bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-lg text-slate-400 italic">
                              1. Estimate Agreement not uploaded
                            </span>
                          )}

                          {orderDetail.purchaseAgreementUrl ? (
                            <a
                              href={orderDetail.purchaseAgreementUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition font-medium"
                            >
                              <DocumentTextIcon className="w-4 h-4 text-slate-500" /> 2. Signed Final Purchase Agreement
                              <ArrowDownTrayIcon className="w-4 h-4 ml-auto text-slate-400" />
                            </a>
                          ) : (
                            <span className="text-sm bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-lg text-slate-400 italic">
                              2. Final Purchase Agreement not uploaded
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {orderDetail.comment && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-[10px] uppercase tracking-wide text-amber-700 font-bold mb-1">Comment</p>
                        <p className="text-sm text-slate-800 whitespace-pre-line">{orderDetail.comment}</p>
                      </div>
                    )}

                    {/* Items */}
                    {detailSummary && detailSummary.itemCount > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <DocumentTextIcon className="w-4 h-4 text-slate-500" /> Items ({detailSummary.itemCount})
                          </p>
                          <button
                            type="button"
                            onClick={() => setExpandedItems((v) => !v)}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 border border-slate-200 px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 transition-colors"
                          >
                            {expandedItems ? (
                              <><ChevronUpIcon className="w-3.5 h-3.5" /> Collapse</>
                            ) : (
                              <><ChevronDownIcon className="w-3.5 h-3.5" /> Expand</>
                            )}
                          </button>
                        </div>

                        {expandedItems && (
                          <>
                            {/* Item totals strip */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-center">
                                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">Gross</p>
                                <p className="text-sm font-bold text-slate-900">{detailSummary.totalGross.toFixed(3)}g</p>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-center">
                                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">Net</p>
                                <p className="text-sm font-bold text-slate-900">{detailSummary.totalNet.toFixed(3)}g</p>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-center">
                                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">Pieces</p>
                                <p className="text-sm font-bold text-slate-900">{detailSummary.totalPieces}</p>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-center">
                                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">Purity</p>
                                <p className="text-sm font-bold text-slate-900 truncate">{Object.keys(detailSummary.byPurity).join(', ')}</p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              {orderDetail.items.map((item, i) => {
                                const images = getImageUrls(item);
                                return (
                                  <div key={item.id || i} className="flex gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <ItemImageCarousel images={images} alt={item.name} onPreview={setPreviewImage} size={64} />

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="font-semibold text-sm text-slate-900 truncate">
                                          {item.name}
                                          {item.purity && <span className="ml-1 text-[10px] text-slate-500 font-normal">({item.purity})</span>}
                                        </p>
                                        <span className="text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">×{item.count || 1}</span>
                                      </div>
                                      
                                      <div className="mt-2 grid grid-cols-4 gap-2 text-[10px] text-slate-600">
                                        <div><span className="text-slate-400 block mb-0.5">Gross</span><span className="font-semibold text-slate-800">{(item.grossWeight || 0).toFixed(2)}</span></div>
                                        <div><span className="text-slate-400 block mb-0.5">Stone</span><span className="font-semibold text-slate-800">{(item.stoneWeight || 0).toFixed(2)}</span></div>
                                        <div><span className="text-slate-400 block mb-0.5">Dust</span><span className="font-semibold text-slate-800">{(item.dustWeight || 0).toFixed(2)}</span></div>
                                        <div><span className="text-slate-900 block font-bold mb-0.5">Net</span><span className="font-bold text-slate-900">{(item.netWeight || 0).toFixed(2)}</span></div>
                                      </div>
                                      
                                      {/* Pre-Estimation Badge */}
                                      {item.preEstimationGrossWeight != null && (
                                        <div className="mt-2.5 inline-block text-[10px] bg-amber-50 text-amber-800 px-2 py-1 rounded-md border border-amber-200 font-medium">
                                          Pre-Est: <strong>{parseFloat(item.preEstimationGrossWeight).toFixed(2)}g</strong>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end">
                <button
                  onClick={closeDetail}
                  className="bg-white border border-slate-300 text-slate-700 font-medium py-2.5 px-6 rounded-lg hover:bg-slate-100 transition-colors text-sm shadow-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}