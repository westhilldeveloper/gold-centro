// app/admin/agent-custody/page.js
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  UserGroupIcon,
  XMarkIcon,
  CheckCircleIcon,
  PhotoIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import ImagePreview from '../../components/ImagePreview';

export default function AdminAgentCustodyPage() {
  const [custody, setCustody] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [expandedCarrier, setExpandedCarrier] = useState(true);

  const fetchCustody = async () => {
    try {
      const res = await fetch('/api/admin/agent-custody');
      const data = await res.json();
      if (data.success) setCustody(data.custody);
    } catch (err) {
      toast.error('Failed to load custody');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustody();
  }, []);

  const openDetail = async (entry) => {
    setSelected(entry);
    setDetailLoading(true);
    const expanded = {};
    entry.orders.forEach((o) => (expanded[o.id] = true));
    setExpandedOrders(expanded);
    setExpandedCarrier(true);
    try {
      const res = await fetch(`/api/admin/agent-custody/${entry.agent.id}`);
      const data = await res.json();
      if (data.success) setDetail(data);
    } catch (err) {
      toast.error('Failed to load details');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setDetail(null);
    setExpandedOrders({});
  };

  const toggleExpanded = (orderId) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />

      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <UserGroupIcon className="w-8 h-8 text-yellow-600" /> Agent Custody
        </h1>
        <p className="text-gray-500 mt-1">
          Gold currently in agent hands — bought from customers or carried for transfer
        </p>
      </div>

      {custody.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-300 mx-auto mb-4" />
          <p className="text-gray-500">No gold currently in agent custody. ✅</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {custody.map((entry) => {
            const hasBranch = !!entry.agent.branchId;
            const hasOrders = entry.orders.length > 0;
            const hasCarrier = entry.carrierItems.length > 0;

            return (
              <motion.div
                key={entry.agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-md p-5 border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-lg">
                    {entry.agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {entry.agent.name}
                    </p>
                    <p className="text-xs text-gray-500">{entry.agent.phone}</p>
                  </div>
                </div>

                {/* Branch assignment */}
                <div className="mt-3">
                  {entry.agent.branch ? (
                    <span className="inline-block text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                      🏦 {entry.agent.branch.name} ({entry.agent.branch.code})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                      <ExclamationTriangleIcon className="w-3 h-3" />
                      No branch assigned
                    </span>
                  )}
                </div>

                {/* ── Bought holding ── */}
                {hasOrders && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <CubeIcon className="w-3 h-3" /> Holding (bought) ·{' '}
                      {entry.orders.length} order{entry.orders.length !== 1 ? 's' : ''}
                    </p>
                    <div className="space-y-1">
                      {Object.entries(entry.totalByPurity).map(
                        ([purity, weight]) => (
                          <div
                            key={purity}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-gray-600">{purity}</span>
                            <span className="font-medium text-gray-900">
                              {weight.toFixed(2)}g
                            </span>
                          </div>
                        )
                      )}
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-100 text-sm">
                      <span className="text-gray-700 font-semibold">Total</span>
                      <span className="font-bold text-yellow-700">
                        {entry.totalWeight.toFixed(2)}g
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Carrying for transfer ── */}
                {hasCarrier && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-orange-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <TruckIcon className="w-3 h-3" /> Carrying for delivery ·{' '}
                      {entry.carrierItems.length} item
                      {entry.carrierItems.length !== 1 ? 's' : ''}
                    </p>
                    <div className="space-y-1">
                      {Object.entries(entry.carrierByPurity).map(
                        ([purity, weight]) => (
                          <div
                            key={purity}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-orange-700">{purity}</span>
                            <span className="font-medium text-orange-800">
                              {weight.toFixed(2)}g
                            </span>
                          </div>
                        )
                      )}
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-orange-100 text-sm">
                      <span className="text-orange-800 font-semibold">In transit</span>
                      <span className="font-bold text-orange-700">
                        {entry.carrierWeight.toFixed(2)}g
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => openDetail(entry)}
                  className="mt-4 w-full bg-gray-900 hover:bg-black text-white font-semibold py-2.5 rounded-xl shadow-md transition"
                >
                  View Details
                </button>

                {!hasBranch && hasOrders && (
                  <p className="mt-2 text-[11px] text-red-600 text-center">
                    Assign a branch before the agent can deposit.
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
              <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                    {selected.agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {selected.agent.name}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {detail?.agent?.branch
                        ? `Assigned branch: ${detail.agent.branch.name} (${detail.agent.branch.code})`
                        : 'No branch assigned'}
                    </p>
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
              {detailLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : detail ? (
                <>
                  <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* ── Carrying for delivery ── */}
                    {detail.carrierItems?.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setExpandedCarrier((v) => !v)}
                          className="w-full flex items-center justify-between mb-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 hover:bg-orange-100 transition"
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold text-orange-800">
                            <TruckIcon className="w-4 h-4" />
                            Carrying for Delivery ({detail.carrierItems.length})
                          </span>
                          {expandedCarrier ? (
                            <ChevronUpIcon className="w-4 h-4 text-orange-700" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4 text-orange-700" />
                          )}
                        </button>

                        <AnimatePresence>
                          {expandedCarrier && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-2">
                                {detail.carrierItems.map((it) => {
                                  const firstImg =
                                    Array.isArray(it.imageUrls) &&
                                    it.imageUrls.length > 0
                                      ? it.imageUrls[0]
                                      : null;
                                  return (
                                    <div
                                      key={it.id}
                                      className="flex gap-3 bg-orange-50/60 rounded-xl p-2.5 border border-orange-100"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          firstImg && setPreviewImage(firstImg)
                                        }
                                        disabled={!firstImg}
                                        className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-orange-200 bg-white flex items-center justify-center disabled:cursor-default"
                                      >
                                        {firstImg ? (
                                          <img
                                            src={firstImg}
                                            alt={it.name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <PhotoIcon className="w-6 h-6 text-gray-300" />
                                        )}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <p className="font-medium text-sm text-gray-900 truncate">
                                            {it.name}
                                            {it.purity && (
                                              <span className="ml-1 text-[10px] text-gray-500 font-normal">
                                                ({it.purity})
                                              </span>
                                            )}
                                          </p>
                                          <span className="text-xs text-gray-500 whitespace-nowrap">
                                            ×{it.count}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                          Order #{it.order?.id?.slice(-6)} ·{' '}
                                          {it.order?.customer?.name || '—'}
                                        </p>
                                        <div className="mt-1 grid grid-cols-4 gap-1 text-[10px] text-gray-600">
                                          <div>
                                            <span className="text-gray-400 block">
                                              Gross
                                            </span>
                                            <span className="font-semibold">
                                              {(it.grossWeight || 0).toFixed(2)}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-gray-400 block">
                                              Stone
                                            </span>
                                            <span className="font-semibold">
                                              {(it.stoneWeight || 0).toFixed(2)}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-gray-400 block">
                                              Dust
                                            </span>
                                            <span className="font-semibold">
                                              {(it.dustWeight || 0).toFixed(2)}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-orange-700 block font-medium">
                                              Net
                                            </span>
                                            <span className="font-bold text-orange-700">
                                              {(it.netWeight || 0).toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* ── Holding (bought) ── */}
                    {detail.orders.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <CubeIcon className="w-4 h-4 text-purple-600" />
                          Holding — purchased from customers ({detail.orders.length})
                        </p>

                        <div className="space-y-3">
                          {detail.orders.map((o) => {
                            const isOpen = !!expandedOrders[o.id];
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
                                      className="overflow-hidden"
                                    >
                                      <div className="px-3 pb-3 pt-1 space-y-2">
                                        {o.items.map((item, i) => {
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
                                                className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center disabled:cursor-default"
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
                                                    <span className="text-gray-400 block">Gross</span>
                                                    <span className="font-semibold">
                                                      {(item.grossWeight || 0).toFixed(2)}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-gray-400 block">Stone</span>
                                                    <span className="font-semibold">
                                                      {(item.stoneWeight || 0).toFixed(2)}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-gray-400 block">Dust</span>
                                                    <span className="font-semibold">
                                                      {(item.dustWeight || 0).toFixed(2)}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-yellow-700 block font-medium">Net</span>
                                                    <span className="font-bold text-yellow-700">
                                                      {(item.netWeight || 0).toFixed(2)}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
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
                    )}

                    {detail.orders.length === 0 &&
                      (!detail.carrierItems || detail.carrierItems.length === 0) && (
                        <p className="text-center text-gray-500 py-8">
                          No items currently in this agent's custody.
                        </p>
                      )}
                  </div>

                  <div className="border-t border-gray-100 bg-white px-6 py-4 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Read-only. Custody is released when the branch confirms receipt.
                    </p>
                    <button
                      onClick={closeDetail}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2.5 px-6 rounded-xl"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : null}
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