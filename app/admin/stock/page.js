'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CubeIcon,
  UserGroupIcon,
  TruckIcon,
  ArrowDownTrayIcon,
  PhotoIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import ItemPipelineModal from '../../components/ItemPipelineModal';

// Normalize whatever image shape the backend returns into an array of URLs.
// Handles: imageUrls (array), imageUrl (singular, legacy), null/undefined.
function getImageUrls(item) {
  if (!item) return [];
  if (Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
    return item.imageUrls.filter(Boolean);
  }
  if (Array.isArray(item.imageUrl) && item.imageUrl.length > 0) {
    return item.imageUrl.filter(Boolean);
  }
  if (typeof item.imageUrls === 'string' && item.imageUrls) {
    return [item.imageUrls];
  }
  if (typeof item.imageUrl === 'string' && item.imageUrl) {
    return [item.imageUrl];
  }
  return [];
}

export default function StockPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [expandedBranch, setExpandedBranch] = useState(null);
  const [activeTab, setActiveTab] = useState('branches');
  const [pipelineItemId, setPipelineItemId] = useState(null);

  useEffect(() => {
    fetch('/api/admin/stock-overview')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d);
      })
      .catch((err) => console.error('Failed to load:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl">
        Failed to load stock data.
      </div>
    );
  }

  const {
    branches,
    grandTotals,
    custodyOrders,
    custody,
    inTransitMovements,
    inTransitTotal,
  } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <CubeIcon className="w-8 h-8 text-yellow-600" /> Stock Overview
        </h1>
        <p className="text-gray-500 mt-1">
          Real-time view of gold across all branches, agents, and in-transit
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl shadow-md p-5 text-black">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5" />
            <p className="text-sm font-medium opacity-80">
              With Agents (Custody)
            </p>
          </div>
          <p className="text-3xl font-bold mt-2">
            {custody.totalNet.toFixed(2)}g
          </p>
          <p className="text-xs opacity-80 mt-1">
            {custody.orders} order(s) • {custody.items} item(s)
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center gap-2 text-green-700">
            <ArrowDownTrayIcon className="w-5 h-5" />
            <p className="text-sm font-medium">In Branch Stock</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {grandTotals.net.toFixed(2)}g
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {grandTotals.pieces} piece(s) • {grandTotals.items} item(s)
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center gap-2 text-yellow-700">
            <TruckIcon className="w-5 h-5" />
            <p className="text-sm font-medium">In Transit</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {inTransitTotal.toFixed(2)}g
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {inTransitMovements.length} shipment(s)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('branches')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'branches'
              ? 'text-yellow-600 border-b-2 border-yellow-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Branch Stock ({grandTotals.items})
        </button>
        <button
          onClick={() => setActiveTab('custody')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'custody'
              ? 'text-yellow-600 border-b-2 border-yellow-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          With Agents ({custody.items})
        </button>
        <button
          onClick={() => setActiveTab('transit')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'transit'
              ? 'text-yellow-600 border-b-2 border-yellow-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          In Transit ({inTransitMovements.length})
        </button>
      </div>

      {/* ---- BRANCHES TAB ---- */}
      {activeTab === 'branches' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3"
        >
          {branches.map((b) => {
            const isExpanded = expandedBranch === b.id;
            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden"
              >
                <div className="px-6 py-4 flex flex-wrap justify-between gap-3 items-center">
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center">
                        <BuildingStorefrontIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {b.branch.name}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {b.branch.code}
                        </p>
                      </div>
                    </div>

                    {Object.keys(b.byPurity).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {Object.entries(b.byPurity).map(([p, v]) => (
                          <span
                            key={`${b.id}-${p}`}
                            className="text-xs bg-gray-50 border border-gray-200 rounded-full px-3 py-1"
                          >
                            <strong className="text-gray-900">{p}</strong>
                            <span className="text-gray-500 ml-1">
                              {v.netWeight.toFixed(2)}g • {v.totalPieces}pc
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total Net</p>
                      <p className="text-xl font-bold text-yellow-700">
                        {b.totalNet.toFixed(2)}g
                      </p>
                    </div>
                    {b.itemCount > 0 && (
                      <button
                        onClick={() =>
                          setExpandedBranch(isExpanded ? null : b.id)
                        }
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUpIcon className="w-4 h-4" /> Hide
                          </>
                        ) : (
                          <>
                            <ChevronDownIcon className="w-4 h-4" /> View{' '}
                            {b.itemCount} items
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && b.itemCount > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="border-t border-gray-100 bg-gray-50 overflow-hidden"
                    >
                      <div className="p-4">
                        <ItemGrid
                          items={b.items}
                          onPreviewImage={setPreviewImage}
                          onOpenPipeline={setPipelineItemId}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {branches.length === 0 && (
            <div className="bg-white rounded-2xl shadow-md p-12 text-center text-gray-500">
              No branches found.
            </div>
          )}
        </motion.div>
      )}

      {/* ---- CUSTODY TAB ---- */}
      {activeTab === 'custody' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3"
        >
          {custodyOrders.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md p-12 text-center text-gray-500">
              <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p>No gold currently held by agents.</p>
            </div>
          ) : (
            custodyOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-100 bg-yellow-50/50">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <p className="font-mono text-xs text-gray-500">
                        Order #{order.id.slice(-8)}
                      </p>
                      <p className="font-semibold text-gray-900 mt-1">
                        {order.agent?.name || 'Unknown Agent'}
                        <span className="text-sm text-gray-500 font-normal ml-2">
                          ({order.agent?.phone})
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-yellow-700">
                        {order.weight.toFixed(2)}g
                      </p>
                      <p className="text-xs text-gray-500">{order.purity}</p>
                    </div>
                  </div>
                </div>

                {order.items?.length > 0 && (
                  <div className="p-4">
                    <ItemGrid
                      items={order.items}
                      onPreviewImage={setPreviewImage}
                      onOpenPipeline={setPipelineItemId}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* ---- IN-TRANSIT TAB ---- */}
      {activeTab === 'transit' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3"
        >
          {inTransitMovements.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md p-12 text-center text-gray-500">
              <TruckIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p>No items in transit.</p>
            </div>
          ) : (
            inTransitMovements.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-2xl shadow-md border border-gray-100 p-5"
              >
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <TruckIcon className="w-5 h-5 text-yellow-600" />
                      <p className="font-semibold text-gray-900">
                        {m.fromBranch?.name || 'External'} →{' '}
                        {m.toBranch?.name || 'External'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      #{m.id.slice(-8)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-yellow-700">
                      {m.weight.toFixed(2)}g
                    </p>
                    <p className="text-xs text-gray-500">
                      {m.purity} • {m.itemIds?.length || 0} item(s)
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

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
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Pipeline Modal */}
      <ItemPipelineModal
        itemId={pipelineItemId}
        onClose={() => setPipelineItemId(null)}
      />
    </div>
  );
}

// ============================================
// ItemImageCarousel – shows one image at a time,
// with prev/next arrows when multiple are present.
// ============================================
function ItemImageCarousel({ images, alt, onPreview, size = 80 }) {
  const [index, setIndex] = useState(0);
  const total = images.length;

  // Guard against index drift when the source array changes
  useEffect(() => {
    if (index >= total) setIndex(0);
  }, [total, index]);

  if (total === 0) {
    return (
      <div
        className="flex-shrink-0 rounded-lg border-2 border-gray-200 bg-white flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <PhotoIcon
          className="text-gray-300"
          style={{ width: size * 0.4, height: size * 0.4 }}
        />
      </div>
    );
  }

  const current = images[index];
  const hasMultiple = total > 1;

  const goPrev = (e) => {
    e.stopPropagation();
    setIndex((i) => (i - 1 + total) % total);
  };
  const goNext = (e) => {
    e.stopPropagation();
    setIndex((i) => (i + 1) % total);
  };

  return (
    <div
      className="relative flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-yellow-400 transition bg-white"
      style={{ width: size, height: size }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPreview(current);
        }}
        className="w-full h-full block"
      >
        <img
          src={current}
          alt={alt || 'item'}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </button>

      {hasMultiple && (
        <>
          {/* Prev arrow */}
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous image"
            className="absolute left-0.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center transition"
          >
            <ChevronLeftIcon className="w-3 h-3" />
          </button>

          {/* Next arrow */}
          <button
            type="button"
            onClick={goNext}
            aria-label="Next image"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center transition"
          >
            <ChevronRightIcon className="w-3 h-3" />
          </button>

          {/* Counter badge */}
          <span className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded-full leading-none">
            {index + 1}/{total}
          </span>
        </>
      )}
    </div>
  );
}

// ============================================
// ItemGrid – reusable
// ============================================
function ItemGrid({ items, onPreviewImage, onOpenPipeline }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((item) => {
        const images = getImageUrls(item);
        const purity = item.purity || item.order?.purity;

        return (
          <div
            key={item.id}
            className="flex gap-3 bg-white rounded-xl p-3 border border-gray-100 hover:border-yellow-400 hover:shadow-md transition cursor-pointer"
            onClick={() => onOpenPipeline(item.id)}
          >
            <ItemImageCarousel
              images={images}
              alt={item.name}
              onPreview={onPreviewImage}
              size={80}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {item.name}
                </p>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  ×{item.count}
                </span>
                {purity && (
                  <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                    {purity}
                  </span>
                )}
              </div>

              {item.order && (
                <div className="mt-1 text-[11px] text-gray-500 space-y-0.5">
                  <p>
                    <span className="text-gray-400">Order:</span>{' '}
                    <span className="font-mono text-gray-700">
                      #{item.order.id?.slice(-6)}
                    </span>
                  </p>
                  {item.order.customer?.name && (
                    <p>
                      <span className="text-gray-400">Customer:</span>{' '}
                      <span className="text-gray-700">
                        {item.order.customer.name}
                      </span>
                    </p>
                  )}
                  {item.order.agent?.name && (
                    <p>
                      <span className="text-gray-400">Agent:</span>{' '}
                      <span className="text-gray-700">
                        {item.order.agent.name}
                      </span>
                    </p>
                  )}
                  {item.order.paymentMode && (
                    <p>
                      <span className="text-gray-400">Payment:</span>{' '}
                      <span className="text-gray-700">
                        {item.order.paymentMode}
                      </span>
                    </p>
                  )}
                </div>
              )}

              <div className="mt-2 flex gap-3 text-xs">
                <p>
                  <span className="text-gray-400">Gross:</span>{' '}
                  <span className="font-medium">
                    {item.grossWeight?.toFixed(2)}g
                  </span>
                </p>
                <p>
                  <span className="text-gray-400">Net:</span>{' '}
                  <span className="font-bold text-yellow-700">
                    {item.netWeight?.toFixed(2)}g
                  </span>
                </p>
              </div>

              <p className="text-[10px] text-blue-500 mt-1 font-medium">
                View pipeline →
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}