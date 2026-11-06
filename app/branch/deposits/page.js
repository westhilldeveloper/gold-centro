// D:\gold-centro\app\branch\deposits\page.js
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  XMarkIcon,
  CheckCircleIcon,
  PhotoIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  DocumentTextIcon,
  UserCircleIcon,
  BuildingStorefrontIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import ImagePreview from '../../components/ImagePreview';

const PAGE_SIZE = 20;

export default function BranchDeposits() {
  const { user } = useAuth();

  // Pending
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);

  // History (paginated)
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Receive flow
  const [selected, setSelected] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({});

  // Deposit detail
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [depositDetail, setDepositDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedDetailOrders, setExpandedDetailOrders] = useState({});

  const [previewImage, setPreviewImage] = useState(null);

  // ---------- Loaders ----------
  const loadPending = useCallback(async () => {
    if (!user?.branchId) return;
    setPendingLoading(true);
    try {
      const res = await fetch(
        `/api/branch/pending-deposits?branchId=${user.branchId}`
      );
      const data = await res.json();
      if (data.success) setPending(data.custody || []);
    } catch (err) {
      console.error(err);
    } finally {
      setPendingLoading(false);
    }
  }, [user?.branchId]);

  const loadHistory = useCallback(
    async (page = 1) => {
      if (!user?.branchId) return;
      setHistoryLoading(true);
      try {
        const res = await fetch(
          `/api/branch/deposits?branchId=${user.branchId}&page=${page}&limit=${PAGE_SIZE}`
        );
        const data = await res.json();
        if (data.success) {
          setHistory(data.deposits || []);
          const p = data.pagination || {};
          setHistoryPage(p.page || 1);
          setHistoryTotal(p.total ?? (data.deposits?.length || 0));
          setHistoryTotalPages(p.totalPages || 1);
        } else {
          toast.error(data.error || 'Failed to load deposits');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load deposits');
      } finally {
        setHistoryLoading(false);
      }
    },
    [user?.branchId]
  );

  useEffect(() => {
    loadPending();
    loadHistory(1);
  }, [loadPending, loadHistory]);

  const goToPage = (page) => {
    if (page < 1 || page > historyTotalPages || page === historyPage) return;
    loadHistory(page);
  };

  // ---------- Receive flow ----------
  const openReceive = (entry) => {
    setSelected(entry);
    setSelectedOrders(entry.orders.map((o) => o.id));
    const expanded = {};
    entry.orders.forEach((o) => (expanded[o.id] = true));
    setExpandedOrders(expanded);
  };

  const closeReceive = () => {
    setSelected(null);
    setSelectedOrders([]);
    setExpandedOrders({});
  };

  const toggleOrder = (orderId) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleExpanded = (orderId) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const selectedSummary = useMemo(() => {
    if (!selected) return { byPurity: {}, total: 0, count: 0 };
    const byPurity = {};
    let total = 0;
    let count = 0;
    selected.orders.forEach((o) => {
      if (!selectedOrders.includes(o.id)) return;
      count += 1;
      total += o.weight || 0;
      const p = o.purity || '—';
      byPurity[p] = (byPurity[p] || 0) + (o.weight || 0);
    });
    return { byPurity, total, count };
  }, [selected, selectedOrders]);

  const handleReceive = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Select orders');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/branch/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selected.agent.id,
          branchId: user.branchId,
          orderIds: selectedOrders,
          receivedBy: user.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('✅ Gold received!');
      closeReceive();
      await Promise.all([loadPending(), loadHistory(1)]);
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Deposit detail ----------
  const openDepositDetail = async (deposit) => {
    setSelectedDeposit(deposit);
    setDepositDetail(null);
    setDetailLoading(true);
    setExpandedDetailOrders({});

    try {
      const res = await fetch(`/api/branch/deposits/${deposit.id}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setDepositDetail(data);
      const expanded = {};
      (data.orders || []).forEach((o) => (expanded[o.id] = true));
      setExpandedDetailOrders(expanded);
    } catch (err) {
      toast.error('Failed to load deposit: ' + err.message);
      setSelectedDeposit(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDepositDetail = () => {
    setSelectedDeposit(null);
    setDepositDetail(null);
    setExpandedDetailOrders({});
  };

  const toggleDetailOrder = (orderId) => {
    setExpandedDetailOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const loading = pendingLoading || historyLoading;

  if (loading && pending.length === 0 && history.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Compact page-number list for pagination
  const pageNumbers = () => {
    const total = historyTotalPages;
    const current = historyPage;
    const pages = [];
    const push = (n) => pages.push(n);

    if (total <= 7) {
      for (let i = 1; i <= total; i++) push(i);
    } else if (current <= 4) {
      [1, 2, 3, 4, 5].forEach(push);
      push('...');
      push(total);
    } else if (current >= total - 3) {
      push(1);
      push('...');
      [total - 4, total - 3, total - 2, total - 1, total].forEach(push);
    } else {
      push(1);
      push('...');
      [current - 1, current, current + 1].forEach(push);
      push('...');
      push(total);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ArrowDownTrayIcon className="w-8 h-8 text-yellow-600" /> Agent Deposits
        </h1>
        <p className="text-gray-500 mt-1">
          Receive gold from agents into branch stock
        </p>
      </div>

      {/* Pending */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center text-gray-500">
            <CheckCircleIcon className="w-12 h-12 text-green-300 mx-auto mb-2" />
            All clear. No pending deposits.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pending.map((entry) => (
              <motion.div
                key={entry.agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-md p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                    {entry.agent.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{entry.agent.name}</p>
                    <p className="text-xs text-gray-500">{entry.agent.phone}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                  {Object.entries(entry.totalByPurity).map(([p, w]) => (
                    <div key={p} className="flex justify-between">
                      <span className="text-gray-500">{p}</span>
                      <span className="font-medium">{w.toFixed(2)}g</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="text-gray-700 font-semibold">Total</span>
                    <span className="font-bold text-yellow-700">
                      {entry.totalWeight.toFixed(2)}g
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => openReceive(entry)}
                  className="mt-4 w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-2.5 rounded-xl"
                >
                  Receive ({entry.orders.length})
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* History — paginated */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-semibold">
            Deposit History{' '}
            <span className="text-sm font-normal text-gray-500">
              ({historyTotal} total)
            </span>
          </h2>
          {historyTotalPages > 1 && (
            <span className="text-xs text-gray-500">
              Page {historyPage} of {historyTotalPages}
            </span>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-md divide-y divide-gray-100">
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No deposits yet.</p>
          ) : (
            history.map((d) => (
              <button
                key={d.id}
                onClick={() => openDepositDetail(d)}
                className="w-full text-left px-5 py-4 flex justify-between items-center hover:bg-yellow-50/40 transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
                    <ClipboardDocumentCheckIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-gray-400">
                      #{d.id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-sm font-medium truncate">
                      {d.agent?.name || 'Unknown agent'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(d.depositedAt).toLocaleString()} •{' '}
                      {d.orderIds?.length || 0} order(s)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      {d.weight.toFixed(2)}g
                    </p>
                    <p className="text-xs text-gray-500">{d.purity}</p>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-yellow-500 transition" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Pagination controls */}
        {historyTotalPages > 1 && !historyLoading && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1">
            <button
              onClick={() => goToPage(historyPage - 1)}
              disabled={historyPage <= 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-4 h-4" /> Prev
            </button>

            {pageNumbers().map((p, idx) =>
              p === '...' ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-2 text-sm text-gray-400 select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`min-w-[38px] px-3 py-2 rounded-lg text-sm font-medium transition ${
                    p === historyPage
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-sm'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => goToPage(historyPage + 1)}
              disabled={historyPage >= historyTotalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ---------- Receive modal ---------- */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeReceive}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                    {selected.agent.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Receive from {selected.agent.name}
                    </h2>
                    <p className="text-xs text-gray-500">
                      Verify each product before accepting
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeReceive}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {selected.orders.map((o) => {
                  const isSelected = selectedOrders.includes(o.id);
                  const isOpen = !!expandedOrders[o.id];
                  const itemCount = o.items?.length || 0;
                  const totalNet = (o.items || []).reduce(
                    (s, i) => s + (i.netWeight || 0),
                    0
                  );

                  return (
                    <div
                      key={o.id}
                      className={`rounded-2xl border-2 transition ${
                        isSelected
                          ? 'border-yellow-400 bg-yellow-50/40'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOrder(o.id)}
                          className="w-4 h-4 accent-yellow-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-gray-500">
                              #{o.id.slice(-8).toUpperCase()}
                            </span>
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                              {o.weight.toFixed(2)}g · {o.purity}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {o.customer?.name} •{' '}
                            {new Date(o.createdAt).toLocaleString()}
                            {o.finalPrice != null && (
                              <>
                                {' '}
                                •{' '}
                                <span className="font-semibold text-gray-700">
                                  ₹{o.finalPrice.toFixed(2)}
                                </span>
                              </>
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleExpanded(o.id)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-100"
                        >
                          {itemCount} item{itemCount !== 1 ? 's' : ''}
                          {isOpen ? (
                            <ChevronUpIcon className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDownIcon className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pt-1 space-y-2">
                              {itemCount === 0 ? (
                                <p className="text-xs italic text-gray-400 text-center py-2">
                                  No products recorded
                                </p>
                              ) : (
                                o.items.map((item, i) => {
                                  const firstImg =
                                    Array.isArray(item.imageUrls) &&
                                    item.imageUrls.length > 0
                                      ? item.imageUrls[0]
                                      : null;
                                  return (
                                    <div
                                      key={item.id || i}
                                      className="flex gap-3 bg-white rounded-xl p-2.5 border border-gray-100"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          firstImg && setPreviewImage(firstImg)
                                        }
                                        disabled={!firstImg}
                                        className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center disabled:cursor-default hover:border-yellow-400 transition"
                                      >
                                        {firstImg ? (
                                          <img
                                            src={firstImg}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <PhotoIcon className="w-6 h-6 text-gray-300" />
                                        )}
                                      </button>

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
                                            ×{item.count}
                                          </span>
                                        </div>
                                        <div className="mt-1 grid grid-cols-4 gap-1 text-[10px] text-gray-600">
                                          <div>
                                            <span className="text-gray-400 block">
                                              Gross
                                            </span>
                                            <span className="font-semibold">
                                              {(
                                                item.grossWeight || 0
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-gray-400 block">
                                              Stone
                                            </span>
                                            <span className="font-semibold">
                                              {(
                                                item.stoneWeight || 0
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-gray-400 block">
                                              Dust
                                            </span>
                                            <span className="font-semibold">
                                              {(
                                                item.dustWeight || 0
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-yellow-700 block font-medium">
                                              Net
                                            </span>
                                            <span className="font-bold text-yellow-700">
                                              {(
                                                item.netWeight || 0
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}

                              {itemCount > 0 && (
                                <div className="flex justify-between text-[11px] pt-1 border-t border-gray-100">
                                  <span className="text-gray-500">
                                    Order net total
                                  </span>
                                  <span className="font-semibold text-gray-800">
                                    {totalNet.toFixed(2)}g
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 bg-white px-6 py-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-gray-600">
                    Selected{' '}
                    <span className="font-semibold text-gray-900">
                      {selectedSummary.count}
                    </span>{' '}
                    of {selected.orders.length}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {Object.entries(selectedSummary.byPurity).map(
                      ([purity, weight]) => (
                        <span
                          key={purity}
                          className="bg-yellow-50 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded-full font-medium"
                        >
                          {purity}: {weight.toFixed(2)}g
                        </span>
                      )
                    )}
                    <span className="bg-gray-900 text-white px-2 py-0.5 rounded-full font-bold">
                      Total {selectedSummary.total.toFixed(2)}g
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeReceive}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReceive}
                    disabled={submitting || selectedOrders.length === 0}
                    className="flex-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-3 rounded-xl disabled:opacity-50"
                  >
                    {submitting
                      ? 'Receiving...'
                      : `Receive ${selectedOrders.length}`}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Deposit detail modal ---------- */}
      <AnimatePresence>
        {selectedDeposit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={closeDepositDetail}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                    <ClipboardDocumentCheckIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Deposit Details
                    </h2>
                    <p className="text-xs text-gray-500 font-mono">
                      #{selectedDeposit.id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeDepositDetail}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {detailLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !depositDetail ? (
                  <p className="text-center text-gray-500 py-8">
                    No detail available.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-yellow-700 font-semibold">
                          Total Weight
                        </p>
                        <p className="text-xl font-bold text-yellow-800 mt-1">
                          {depositDetail.deposit.weight.toFixed(2)}g
                        </p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                          Purity
                        </p>
                        <p className="text-xl font-bold text-gray-900 mt-1">
                          {depositDetail.deposit.purity}
                        </p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                          Orders
                        </p>
                        <p className="text-xl font-bold text-gray-900 mt-1">
                          {depositDetail.orders.length}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <UserCircleIcon className="w-4 h-4 text-gray-500" />
                          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                            Deposited by agent
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {depositDetail.deposit.agent?.name || '—'}
                        </p>
                        {depositDetail.deposit.agent?.phone && (
                          <p className="text-xs text-gray-500">
                            {depositDetail.deposit.agent.phone}
                          </p>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircleIcon className="w-4 h-4 text-green-600" />
                          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                            Received by
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {depositDetail.receivedByUser?.name || '—'}
                        </p>
                        {depositDetail.receivedByUser?.phone && (
                          <p className="text-xs text-gray-500">
                            {depositDetail.receivedByUser.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <BuildingStorefrontIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">At branch:</span>
                        <span className="font-semibold text-gray-900">
                          {depositDetail.deposit.branch?.name}
                          {depositDetail.deposit.branch?.code &&
                            ` (${depositDetail.deposit.branch.code})`}
                        </span>
                      </div>
                      <div className="text-gray-500">
                        {new Date(
                          depositDetail.deposit.depositedAt
                        ).toLocaleString()}
                      </div>
                    </div>

                    {depositDetail.deposit.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-1">
                          Notes
                        </p>
                        <p className="text-sm text-gray-800 whitespace-pre-line">
                          {depositDetail.deposit.notes}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                        Orders in this deposit ({depositDetail.orders.length})
                      </p>

                      <div className="space-y-3">
                        {depositDetail.orders.map((o) => {
                          const isOpen = !!expandedDetailOrders[o.id];
                          const itemCount = o.items?.length || 0;
                          const totalNet = (o.items || []).reduce(
                            (s, i) => s + (i.netWeight || 0),
                            0
                          );

                          return (
                            <div
                              key={o.id}
                              className="rounded-2xl border border-gray-200 bg-white"
                            >
                              <div className="flex items-center gap-3 p-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs text-gray-500">
                                      #{o.id.slice(-8).toUpperCase()}
                                    </span>
                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                                      {o.weight.toFixed(2)}g · {o.purity}
                                    </span>
                                    {o.paymentMode && (
                                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                        {o.paymentMode}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {o.customer?.name || '—'} •{' '}
                                    {new Date(o.createdAt).toLocaleString()}
                                    {o.finalPrice != null && (
                                      <>
                                        {' '}
                                        •{' '}
                                        <span className="font-semibold text-gray-700">
                                          ₹{o.finalPrice.toFixed(2)}
                                        </span>
                                      </>
                                    )}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleDetailOrder(o.id)}
                                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-100"
                                >
                                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                                  {isOpen ? (
                                    <ChevronUpIcon className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDownIcon className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>

                              <AnimatePresence initial={false}>
                                {isOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-3 pb-3 pt-1 space-y-2">
                                      {itemCount === 0 ? (
                                        <p className="text-xs italic text-gray-400 text-center py-2">
                                          No products recorded
                                        </p>
                                      ) : (
                                        o.items.map((item, i) => {
                                          const firstImg =
                                            Array.isArray(item.imageUrls) &&
                                            item.imageUrls.length > 0
                                              ? item.imageUrls[0]
                                              : null;
                                          return (
                                            <div
                                              key={item.id || i}
                                              className="flex gap-3 bg-gray-50 rounded-xl p-2.5 border border-gray-100"
                                            >
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  firstImg &&
                                                  setPreviewImage(firstImg)
                                                }
                                                disabled={!firstImg}
                                                className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center disabled:cursor-default hover:border-yellow-400 transition"
                                              >
                                                {firstImg ? (
                                                  <img
                                                    src={firstImg}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                  />
                                                ) : (
                                                  <PhotoIcon className="w-6 h-6 text-gray-300" />
                                                )}
                                              </button>

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
                                                    ×{item.count}
                                                  </span>
                                                </div>
                                                <div className="mt-1 grid grid-cols-4 gap-1 text-[10px] text-gray-600">
                                                  <div>
                                                    <span className="text-gray-400 block">
                                                      Gross
                                                    </span>
                                                    <span className="font-semibold">
                                                      {(
                                                        item.grossWeight || 0
                                                      ).toFixed(2)}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-gray-400 block">
                                                      Stone
                                                    </span>
                                                    <span className="font-semibold">
                                                      {(
                                                        item.stoneWeight || 0
                                                      ).toFixed(2)}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-gray-400 block">
                                                      Dust
                                                    </span>
                                                    <span className="font-semibold">
                                                      {(
                                                        item.dustWeight || 0
                                                      ).toFixed(2)}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-yellow-700 block font-medium">
                                                      Net
                                                    </span>
                                                    <span className="font-bold text-yellow-700">
                                                      {(
                                                        item.netWeight || 0
                                                      ).toFixed(2)}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}

                                      {itemCount > 0 && (
                                        <div className="flex justify-between text-[11px] pt-1 border-t border-gray-200">
                                          <span className="text-gray-500">
                                            Order net total
                                          </span>
                                          <span className="font-semibold text-gray-800">
                                            {totalNet.toFixed(2)}g
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-gray-100 bg-white px-6 py-4 flex justify-end">
                <button
                  onClick={closeDepositDetail}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2.5 px-6 rounded-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImagePreview
        src={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}