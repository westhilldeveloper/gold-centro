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
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import ItemImageCarousel, {
  getImageUrls,
} from '../../components/ItemImageCarousel';

const PAGE_SIZE = 20;

const STATUS_STYLES = {
  AGENT_ASSIGNED: 'bg-blue-100 text-blue-700',
  AGENT_ARRIVED: 'bg-green-100 text-green-700',
  AGENT_OFFER_SENT: 'bg-purple-100 text-purple-700',
  ADMIN_OFFER_SENT: 'bg-orange-100 text-orange-700',
  NEGOTIATING: 'bg-yellow-100 text-yellow-700',
  CUSTOMER_PENDING_ACCEPTANCE: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-gray-100 text-gray-700',
  REJECTED_BY_CUSTOMER: 'bg-red-100 text-red-700',
  DEAL_CLOSED: 'bg-gray-100 text-gray-700',
  OTP_VERIFIED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  PENDING_AGREEMENT: 'bg-amber-100 text-amber-700',
};

const statusLabel = (s) =>
  (s || 'UNKNOWN').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function BranchOrders() {
  const { user } = useAuth();

  // List
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Preview + detail
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState(true);

  // ---------- Load list ----------
  const loadPage = useCallback(
    async (p = 1) => {
      if (!user?.branchId) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/branch/orders?branchId=${user.branchId}&page=${p}&limit=${PAGE_SIZE}`
        );
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
    [user?.branchId]
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
    <div className="space-y-6">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBagIcon className="w-8 h-8 text-yellow-600" /> Orders
          </h1>
          <p className="text-gray-500 mt-1">
            {total} order{total !== 1 ? 's' : ''} handled by this branch
          </p>
        </div>
        {totalPages > 1 && (
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* List */}
      {loading && orders.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center text-gray-500">
          No orders yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md divide-y divide-gray-100 overflow-hidden">
          {loading && (
            <div className="px-6 py-2 bg-yellow-50 text-xs text-yellow-700 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
              Loading…
            </div>
          )}

          {orders.map((o) => {
            const st = STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-700';
            const itemCount = o.items?.length || 0;
            const isDirect = o.orderType === 'BRANCH_DIRECT';

            return (
              <motion.button
                key={o.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => openDetail(o)}
                className="w-full text-left px-6 py-4 hover:bg-yellow-50/40 transition group"
              >
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div className="flex gap-3 min-w-0 flex-1">
                    {/* Tiny thumbnail from first item */}
                    {(() => {
                      const first = getImageUrls(o.items?.[0])[0];
                      return (
                        <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                          {first ? (
                            <img
                              src={first}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <PhotoIcon className="w-6 h-6 text-gray-300" />
                          )}
                        </div>
                      );
                    })()}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-xs text-gray-400">
                          #{o.id.slice(-8).toUpperCase()}
                        </p>
                        {isDirect && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                            Direct Purchase
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-0.5 truncate">
                        {o.customer?.name || '—'}
                        {o.customer?.phone && (
                          <span className="text-gray-500 font-normal ml-1">
                            ({o.customer.phone})
                          </span>
                        )}
                      </p>
                      
                      <p className="text-xs text-gray-500">
                        {isDirect ? 'Staff' : 'Agent'}:{' '}
                        {isDirect 
                          ? (o.staff?.name || '—') 
                          : (o.agent?.name || 'N/A')}
                        {itemCount > 0 && (
                          <>
                            {' '}
                            • {itemCount} item{itemCount !== 1 ? 's' : ''}
                          </>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(o.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                    <p className="font-bold">
                      {o.weight?.toFixed(2)}g{' '}
                      <span className="text-xs text-gray-500 font-normal">
                        ({o.purity})
                      </span>
                    </p>
                    <p className="text-sm text-green-600 font-semibold">
                      ₹
                      {(
                        o.finalPrice ||
                        o.agentOffer ||
                        o.estimatedTotal ||
                        0
                      ).toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${st}`}
                      >
                        {statusLabel(o.status)}
                      </span>
                      <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-yellow-500 transition" />
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="w-4 h-4" /> Prev
          </button>

          {pageNumbers().map((p, idx) =>
            p === '...' ? (
              <span
                key={`e-${idx}`}
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
      )}

      {/* ---------- Detail modal ---------- */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={closeDetail}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center flex-shrink-0">
                    <ShoppingBagIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-900">
                      Order Details
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-500 font-mono">
                        #{selectedOrder.id.slice(-8).toUpperCase()}
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        orderDetail?.orderType === 'BRANCH_DIRECT' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {orderDetail?.orderType === 'BRANCH_DIRECT' ? 'Direct Purchase' : 'Agent Purchase'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeDetail}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {detailLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !orderDetail ? (
                  <p className="text-center text-gray-500 py-8">
                    No detail available.
                  </p>
                ) : (
                  <>
                    {/* Status + price cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-yellow-700 font-semibold">
                          Net Weight
                        </p>
                        <p className="text-xl font-bold text-yellow-800 mt-1">
                          {(orderDetail.weight || 0).toFixed(2)}g
                        </p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                          Purity
                        </p>
                        <p className="text-xl font-bold text-gray-900 mt-1">
                          {orderDetail.purity || '—'}
                        </p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-green-700 font-semibold">
                          Final Price
                        </p>
                        <p className="text-xl font-bold text-green-800 mt-1">
                          ₹
                          {(
                            orderDetail.finalPrice ||
                            orderDetail.agentOffer ||
                            orderDetail.estimatedTotal ||
                            0
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Status bar */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          STATUS_STYLES[orderDetail.status] ||
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {statusLabel(orderDetail.status)}
                      </span>
                      {orderDetail.paymentMode && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                          {orderDetail.paymentMode}
                        </span>
                      )}
                      {orderDetail.isPledged && (
                        <span className="text-xs bg-rose-100 text-rose-700 px-3 py-1 rounded-full font-medium">
                          🔒 Pledged
                        </span>
                      )}
                    </div>

                    {/* Customer + Agent/Staff */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <UserCircleIcon className="w-4 h-4 text-gray-500" />
                          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                            Customer
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {orderDetail.customer?.name || '—'}
                        </p>
                        {orderDetail.customer?.phone && (
                          <p className="text-xs text-gray-500">
                            {orderDetail.customer.phone}
                          </p>
                        )}
                        {orderDetail.customer?.aadhaarNumber && (
                          <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                            Aadhaar: •••• {orderDetail.customer.aadhaarNumber.slice(-4)}
                          </p>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <UserCircleIcon className="w-4 h-4 text-gray-500" />
                          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                            {orderDetail.orderType === 'BRANCH_DIRECT' ? 'Staff' : 'Agent'}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {orderDetail.orderType === 'BRANCH_DIRECT' 
                            ? (orderDetail.staff?.name || '—') 
                            : (orderDetail.agent?.name || '—')}
                        </p>
                        {(orderDetail.orderType === 'BRANCH_DIRECT' ? orderDetail.staff?.phone : orderDetail.agent?.phone) && (
                          <p className="text-xs text-gray-500">
                            {orderDetail.orderType === 'BRANCH_DIRECT' ? orderDetail.staff.phone : orderDetail.agent.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price breakdown */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1.5 text-sm">
                      {orderDetail.estimatedTotal != null && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Estimated</span>
                          <span className="font-medium text-gray-800">
                            ₹{orderDetail.estimatedTotal.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {orderDetail.agentOffer != null && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Agent Offer</span>
                          <span className="font-medium text-gray-800">
                            ₹{orderDetail.agentOffer.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {orderDetail.adminOffer != null && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Admin Offer</span>
                          <span className="font-medium text-gray-800">
                            ₹{orderDetail.adminOffer.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {orderDetail.finalPrice != null && (
                        <div className="flex justify-between pt-1.5 border-t border-gray-200">
                          <span className="text-gray-700 font-semibold">
                            Final Price
                          </span>
                          <span className="font-bold text-green-700">
                            ₹{orderDetail.finalPrice.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {orderDetail.comment && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-1">
                          Comment
                        </p>
                        <p className="text-sm text-gray-800 whitespace-pre-line">
                          {orderDetail.comment}
                        </p>
                      </div>
                    )}

                    {/* Documents (Direct Purchase Agreement) */}
                    {orderDetail.orderType === 'BRANCH_DIRECT' && (
                      <div className="bg-white rounded-xl p-3 border border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Documents</p>
                        {orderDetail.purchaseAgreementUrl ? (
                          <a
                            href={orderDetail.purchaseAgreementUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl text-blue-800 hover:bg-blue-100 transition font-medium"
                          >
                            <DocumentTextIcon className="w-4 h-4" /> Signed Purchase Agreement
                            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">⚠ Agreement not uploaded yet.</span>
                        )}
                      </div>
                    )}

                    {/* Items */}
                    {detailSummary && detailSummary.itemCount > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                            Items ({detailSummary.itemCount})
                          </p>
                          <button
                            type="button"
                            onClick={() => setExpandedItems((v) => !v)}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            {expandedItems ? (
                              <>
                                <ChevronUpIcon className="w-3.5 h-3.5" /> Collapse
                              </>
                            ) : (
                              <>
                                <ChevronDownIcon className="w-3.5 h-3.5" /> Expand
                              </>
                            )}
                          </button>
                        </div>

                        {expandedItems && (
                          <>
                            {/* Item totals strip */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                              <div className="bg-gray-50 rounded-lg p-2 border border-gray-100 text-center">
                                <p className="text-[10px] text-gray-500">Gross</p>
                                <p className="text-sm font-semibold">
                                  {detailSummary.totalGross.toFixed(2)}g
                                </p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2 border border-gray-100 text-center">
                                <p className="text-[10px] text-gray-500">Net</p>
                                <p className="text-sm font-bold text-yellow-700">
                                  {detailSummary.totalNet.toFixed(2)}g
                                </p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2 border border-gray-100 text-center">
                                <p className="text-[10px] text-gray-500">Pieces</p>
                                <p className="text-sm font-semibold">
                                  {detailSummary.totalPieces}
                                </p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2 border border-gray-100 text-center">
                                <p className="text-[10px] text-gray-500">Purity</p>
                                <p className="text-sm font-semibold">
                                  {Object.keys(detailSummary.byPurity).join(', ')}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {orderDetail.items.map((item, i) => {
                                const images = getImageUrls(item);
                                return (
                                  <div
                                    key={item.id || i}
                                    className="flex gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100"
                                  >
                                    <ItemImageCarousel
                                      images={images}
                                      alt={item.name}
                                      onPreview={setPreviewImage}
                                      size={64}
                                    />

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="font-medium text-sm text-gray-900 truncate">
                                          {item.name}
                                          {item.purity && (
                                            <span className="ml-1 text-[10px] text-gray-500 font-normal">
                                              ({item.purity})
                                            </span>
                                          )}
                                        </p>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                          ×{item.count || 1}
                                        </span>
                                      </div>
                                      <div className="mt-1 grid grid-cols-4 gap-1 text-[10px] text-gray-600">
                                        <div>
                                          <span className="text-gray-400 block">
                                            Gross
                                          </span>
                                          <span className="font-semibold">
                                            {(item.grossWeight || 0).toFixed(2)}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 block">
                                            Stone
                                          </span>
                                          <span className="font-semibold">
                                            {(item.stoneWeight || 0).toFixed(2)}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 block">
                                            Dust
                                          </span>
                                          <span className="font-semibold">
                                            {(item.dustWeight || 0).toFixed(2)}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-yellow-700 block font-medium">
                                            Net
                                          </span>
                                          <span className="font-bold text-yellow-700">
                                            {(item.netWeight || 0).toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Pre-Estimation Badge (Direct Purchase only) */}
                                      {item.preEstimationGrossWeight != null && (
                                        <div className="mt-1.5 inline-block text-[10px] bg-orange-50 text-orange-800 px-2 py-1 rounded border border-orange-100">
                                          Pre-Est: <strong>{item.preEstimationGrossWeight.toFixed(2)}g</strong>
                                          {item.preEstimationPurity && ` (${item.preEstimationPurity})`}
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
              <div className="border-t border-gray-100 bg-white px-6 py-4 flex justify-end">
                <button
                  onClick={closeDetail}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2.5 px-6 rounded-xl"
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
            className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-white hover:text-yellow-400 p-2 rounded-full bg-white/10"
            >
              <XMarkIcon className="w-8 h-8" />
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