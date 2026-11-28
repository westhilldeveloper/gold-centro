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
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
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
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <Toaster position="top-center" />
      
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
          <ArrowDownTrayIcon className="w-7 h-7 text-slate-400" /> Agent Deposits
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Receive gold from agents into branch stock
        </p>
      </div>

      {/* Pending */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          Pending Approval <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{pending.length}</span>
        </h2>
        
        {pending.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
            <CheckCircleIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700">All clear</p>
            <p className="text-sm text-slate-500 mt-1">No pending deposits at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pending.map((entry) => (
              <motion.div
                key={entry.agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col"
              >
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                    {entry.agent.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{entry.agent.name}</p>
                    <p className="text-xs text-slate-500">{entry.agent.phone}</p>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2 text-sm flex-1">
                  {Object.entries(entry.totalByPurity).map(([p, w]) => (
                    <div key={p} className="flex justify-between">
                      <span className="text-slate-500">{p} Gold</span>
                      <span className="font-medium text-slate-700">{w.toFixed(3)}g</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 mt-2 border-t border-slate-100">
                    <span className="text-slate-900 font-semibold">Total Weight</span>
                    <span className="font-bold text-slate-900">
                      {entry.totalWeight.toFixed(3)}g
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => openReceive(entry)}
                  className="mt-5 w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  Receive {entry.orders.length} Order{entry.orders.length !== 1 ? 's' : ''}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            Deposit History <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{historyTotal} total</span>
          </h2>
          {historyTotalPages > 1 && (
            <span className="text-xs text-slate-500">
              Page {historyPage} of {historyTotalPages}
            </span>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="p-8 text-center text-slate-500">No deposits recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map((d) => (
                <button
                  key={d.id}
                  onClick={() => openDepositDetail(d)}
                  className="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-slate-50/80 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100">
                      <ClipboardDocumentCheckIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-slate-400">
                        #{d.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {d.agent?.name || 'Unknown agent'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(d.depositedAt).toLocaleString('en-GB')} • {d.orderIds?.length || 0} order(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        {d.weight.toFixed(3)}g
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">{d.purity}</p>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination controls */}
        {historyTotalPages > 1 && !historyLoading && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
            <button
              onClick={() => goToPage(historyPage - 1)}
              disabled={historyPage <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" /> Prev
            </button>

            {pageNumbers().map((p, idx) =>
              p === '...' ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1.5 text-sm text-slate-400 select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`min-w-[36px] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    p === historyPage
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => goToPage(historyPage + 1)}
              disabled={historyPage >= historyTotalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeReceive}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold">
                    {selected.agent.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Receive from {selected.agent.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verify each product before accepting
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeReceive}
                  className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-2 rounded-lg border border-slate-200 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
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
                      className={`rounded-xl border transition-colors ${
                        isSelected
                          ? 'border-slate-900 bg-white shadow-sm'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOrder(o.id)}
                          className="w-4 h-4 accent-slate-900 rounded border-slate-300 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-slate-500">
                              #{o.id.slice(-8).toUpperCase()}
                            </span>
                            <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                              {o.weight.toFixed(3)}g · {o.purity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            {o.customer?.name} • {new Date(o.createdAt).toLocaleString('en-GB')}
                            {o.finalPrice != null && (
                              <>
                                {' '}•{' '}
                                <span className="font-semibold text-slate-700">₹{o.finalPrice.toFixed(2)}</span>
                              </>
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleExpanded(o.id)}
                          className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                        >
                          {itemCount} item{itemCount !== 1 ? 's' : ''}
                          {isOpen ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
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
                            <div className="px-4 pb-4 pt-1 space-y-2">
                              {itemCount === 0 ? (
                                <p className="text-xs italic text-slate-400 text-center py-2">No products recorded</p>
                              ) : (
                                o.items.map((item, i) => {
                                  const firstImg = Array.isArray(item.imageUrls) && item.imageUrls.length > 0 ? item.imageUrls[0] : null;
                                  return (
                                    <div key={item.id || i} className="flex gap-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
                                      <button
                                        type="button"
                                        onClick={() => firstImg && setPreviewImage(firstImg)}
                                        disabled={!firstImg}
                                        className="flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border border-slate-200 bg-white flex items-center justify-center disabled:cursor-default hover:border-slate-400 transition-colors"
                                      >
                                        {firstImg ? (
                                          <img src={firstImg} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <PhotoIcon className="w-6 h-6 text-slate-300" />
                                        )}
                                      </button>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <p className="font-semibold text-sm text-slate-900 truncate">
                                            {item.name}
                                            {item.purity && <span className="ml-1 text-[10px] text-slate-500 font-normal">({item.purity})</span>}
                                          </p>
                                          <span className="text-xs text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">×{item.count}</span>
                                        </div>
                                        <div className="mt-2 grid grid-cols-4 gap-1 text-[10px] text-slate-600">
                                          <div><span className="text-slate-400 block mb-0.5">Gross</span><span className="font-semibold">{(item.grossWeight || 0).toFixed(2)}</span></div>
                                          <div><span className="text-slate-400 block mb-0.5">Stone</span><span className="font-semibold">{(item.stoneWeight || 0).toFixed(2)}</span></div>
                                          <div><span className="text-slate-400 block mb-0.5">Dust</span><span className="font-semibold">{(item.dustWeight || 0).toFixed(2)}</span></div>
                                          <div><span className="text-slate-900 block font-medium mb-0.5">Net</span><span className="font-bold text-slate-900">{(item.netWeight || 0).toFixed(2)}</span></div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                              {itemCount > 0 && (
                                <div className="flex justify-between text-[11px] pt-2 mt-1 border-t border-slate-200">
                                  <span className="text-slate-500">Order net total</span>
                                  <span className="font-bold text-slate-900">{totalNet.toFixed(3)}g</span>
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

              <div className="border-t border-slate-200 bg-white px-6 py-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600">
                    Selected <span className="font-bold text-slate-900">{selectedSummary.count}</span> of {selected.orders.length}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {Object.entries(selectedSummary.byPurity).map(([purity, weight]) => (
                      <span key={purity} className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md font-medium">
                        {purity}: {weight.toFixed(3)}g
                      </span>
                    ))}
                    <span className="bg-slate-900 text-white px-2.5 py-1 rounded-md font-bold border border-slate-900">
                      Total {selectedSummary.total.toFixed(3)}g
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeReceive}
                    className="flex-1 bg-white border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReceive}
                    disabled={submitting || selectedOrders.length === 0}
                    className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg shadow-sm disabled:opacity-50 transition-colors flex items-center justify-center text-sm"
                  >
                    {submitting ? 'Receiving...' : `Receive ${selectedOrders.length} Order(s)`}
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
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={closeDepositDetail}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-emerald-600 flex items-center justify-center">
                    <ClipboardDocumentCheckIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Deposit Details</h2>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">#{selectedDeposit.id.slice(-8).toUpperCase()}</p>
                  </div>
                </div>
                <button
                  onClick={closeDepositDetail}
                  className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-2 rounded-lg border border-slate-200 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {detailLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !depositDetail ? (
                  <p className="text-center text-slate-500 py-8">No detail available.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-1">Total Weight</p>
                        <p className="text-2xl font-bold text-slate-900">{depositDetail.deposit.weight.toFixed(3)}<span className="text-sm font-normal text-slate-400">g</span></p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-1">Purity</p>
                        <p className="text-2xl font-bold text-slate-900">{depositDetail.deposit.purity}</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-1">Orders</p>
                        <p className="text-2xl font-bold text-slate-900">{depositDetail.orders.length}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center gap-2 mb-1.5">
                          <UserCircleIcon className="w-4 h-4 text-slate-500" />
                          <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Deposited by agent</p>
                        </div>
                        <p className="font-semibold text-slate-900">{depositDetail.deposit.agent?.name || '—'}</p>
                        {depositDetail.deposit.agent?.phone && <p className="text-xs text-slate-500 mt-0.5">{depositDetail.deposit.agent.phone}</p>}
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center gap-2 mb-1.5">
                          <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                          <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Received by</p>
                        </div>
                        <p className="font-semibold text-slate-900">{depositDetail.receivedByUser?.name || '—'}</p>
                        {depositDetail.receivedByUser?.phone && <p className="text-xs text-slate-500 mt-0.5">{depositDetail.receivedByUser.phone}</p>}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <BuildingStorefrontIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-500">At branch:</span>
                        <span className="font-semibold text-slate-900">{depositDetail.deposit.branch?.name} {depositDetail.deposit.branch?.code && `(${depositDetail.deposit.branch.code})`}</span>
                      </div>
                      <div className="text-slate-500 font-medium">{new Date(depositDetail.deposit.depositedAt).toLocaleString('en-GB')}</div>
                    </div>

                    {depositDetail.deposit.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-[10px] uppercase tracking-wide text-amber-700 font-bold mb-1">Notes</p>
                        <p className="text-sm text-slate-800 whitespace-pre-line">{depositDetail.deposit.notes}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <DocumentTextIcon className="w-4 h-4 text-slate-500" />
                        Orders in this deposit ({depositDetail.orders.length})
                      </p>

                      <div className="space-y-3">
                        {depositDetail.orders.map((o) => {
                          const isOpen = !!expandedDetailOrders[o.id];
                          const itemCount = o.items?.length || 0;
                          const totalNet = (o.items || []).reduce((s, i) => s + (i.netWeight || 0), 0);

                          return (
                            <div key={o.id} className="rounded-xl border border-slate-200 bg-white">
                              <div className="flex items-center gap-3 p-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs text-slate-500">#{o.id.slice(-8).toUpperCase()}</span>
                                    <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium">{o.weight.toFixed(3)}g · {o.purity}</span>
                                    {o.paymentMode && <span className="text-[10px] bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md">{o.paymentMode}</span>}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1 truncate">
                                    {o.customer?.name || '—'} • {new Date(o.createdAt).toLocaleString('en-GB')}
                                    {o.finalPrice != null && <>{' '}• <span className="font-semibold text-slate-700">₹{o.finalPrice.toFixed(2)}</span></>}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleDetailOrder(o.id)}
                                  className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
                                >
                                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                                  {isOpen ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
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
                                    <div className="px-4 pb-4 pt-1 space-y-2">
                                      {itemCount === 0 ? (
                                        <p className="text-xs italic text-slate-400 text-center py-2">No products recorded</p>
                                      ) : (
                                        o.items.map((item, i) => {
                                          const firstImg = Array.isArray(item.imageUrls) && item.imageUrls.length > 0 ? item.imageUrls[0] : null;
                                          return (
                                            <div key={item.id || i} className="flex gap-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
                                              <button
                                                type="button"
                                                onClick={() => firstImg && setPreviewImage(firstImg)}
                                                disabled={!firstImg}
                                                className="flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border border-slate-200 bg-white flex items-center justify-center disabled:cursor-default hover:border-slate-400 transition-colors"
                                              >
                                                {firstImg ? (
                                                  <img src={firstImg} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                  <PhotoIcon className="w-6 h-6 text-slate-300" />
                                                )}
                                              </button>

                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                  <p className="font-semibold text-sm text-slate-900 truncate">
                                                    {item.name}
                                                    {item.purity && <span className="ml-1 text-[10px] text-slate-500 font-normal">({item.purity})</span>}
                                                  </p>
                                                  <span className="text-xs text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">×{item.count}</span>
                                                </div>
                                                <div className="mt-2 grid grid-cols-4 gap-1 text-[10px] text-slate-600">
                                                  <div><span className="text-slate-400 block mb-0.5">Gross</span><span className="font-semibold">{(item.grossWeight || 0).toFixed(2)}</span></div>
                                                  <div><span className="text-slate-400 block mb-0.5">Stone</span><span className="font-semibold">{(item.stoneWeight || 0).toFixed(2)}</span></div>
                                                  <div><span className="text-slate-400 block mb-0.5">Dust</span><span className="font-semibold">{(item.dustWeight || 0).toFixed(2)}</span></div>
                                                  <div><span className="text-slate-900 block font-medium mb-0.5">Net</span><span className="font-bold text-slate-900">{(item.netWeight || 0).toFixed(2)}</span></div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                      {itemCount > 0 && (
                                        <div className="flex justify-between text-[11px] pt-2 mt-1 border-t border-slate-200">
                                          <span className="text-slate-500">Order net total</span>
                                          <span className="font-bold text-slate-900">{totalNet.toFixed(3)}g</span>
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

              <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end">
                <button
                  onClick={closeDepositDetail}
                  className="bg-white border border-slate-300 text-slate-700 font-medium py-2.5 px-6 rounded-lg hover:bg-slate-100 transition-colors text-sm shadow-sm"
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