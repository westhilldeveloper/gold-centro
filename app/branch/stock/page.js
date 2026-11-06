'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CubeIcon,
  PhotoIcon,
  XMarkIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

// Resolve the effective purity for a given item.
// Prefer the item-level value (which is always a real karat) over the
// order-level value (which may be "MIXED" for multi-karat orders).
const itemPurity = (item) => item.purity || item.order?.purity || 'Unknown';

export default function BranchStock() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [byPurity, setByPurity] = useState({});
  const [inTransitItems, setInTransitItems] = useState([]);
  const [inTransitByPurity, setInTransitByPurity] = useState({});
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL | 24K | 22K | 18K

  useEffect(() => {
    if (!user?.branchId) return;
    fetch(`/api/branch/stock?branchId=${user.branchId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setItems(d.items || []);
          setByPurity(d.byPurity || {});
          setInTransitItems(d.inTransitItems || []);
          setInTransitByPurity(d.inTransitByPurity || {});
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Filter items by purity (item-level)
  const filteredItems = useMemo(() => {
    if (filter === 'ALL') return items;
    return items.filter((it) => itemPurity(it) === filter);
  }, [items, filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const purities = Object.keys(byPurity);
  const totalNet = purities.reduce((s, p) => s + byPurity[p].netWeight, 0);
  const totalGross = purities.reduce((s, p) => s + byPurity[p].grossWeight, 0);
  const totalPieces = purities.reduce((s, p) => s + byPurity[p].totalPieces, 0);
  const inTransitTotal = inTransitItems.reduce(
    (s, it) => s + (it.netWeight || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <CubeIcon className="w-8 h-8 text-yellow-600" /> Stock
        </h1>
        <p className="text-gray-500 mt-1">
          Current gold holdings in this branch
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-6 text-black">
        <p className="text-sm font-medium opacity-80">Total Net Stock</p>
        <p className="text-4xl font-bold mt-1">{totalNet.toFixed(2)}g</p>
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="opacity-80 text-xs">Gross</p>
            <p className="font-bold">{totalGross.toFixed(2)}g</p>
          </div>
          <div>
            <p className="opacity-80 text-xs">Total Pieces</p>
            <p className="font-bold">{totalPieces}</p>
          </div>
        </div>
        {inTransitTotal > 0 && (
          <div className="mt-3 pt-3 border-t border-black/20 flex items-center gap-2 text-xs">
            <TruckIcon className="w-4 h-4" />
            <span>
              + {inTransitTotal.toFixed(2)}g in transit ({inTransitItems.length}{' '}
              items)
            </span>
          </div>
        )}
      </div>

      {/* In-Transit Alert */}
      {inTransitItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <TruckIcon className="w-5 h-5 text-yellow-700 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800 text-sm">
                {inTransitItems.length} item(s) in transit to this branch
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                {Object.entries(inTransitByPurity).map(([p, v], idx) => (
                  <span key={p}>
                    {idx > 0 && ' • '}
                    <strong>{p}</strong>: {(v.netWeight || 0).toFixed(2)}g (
                    {v.count} items)
                  </span>
                ))}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Mark movements as received to add them to your stock.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Purity summary cards */}
      {purities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {purities.map((purity) => {
            const v = byPurity[purity];
            return (
              <motion.div
                key={purity}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-md p-5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {purity}
                    </p>
                    <p className="text-3xl font-bold text-yellow-600 mt-1">
                      {(v.netWeight || 0).toFixed(2)}g
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Pieces</p>
                    <p className="text-2xl font-bold text-gray-700">
                      {v.totalPieces}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs">
                  <span className="text-gray-500">
                    Gross:{' '}
                    <span className="font-medium text-gray-700">
                      {(v.grossWeight || 0).toFixed(2)}g
                    </span>
                  </span>
                  <span className="text-gray-500">
                    Items:{' '}
                    <span className="font-medium text-gray-700">
                      {v.count}
                    </span>
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Filter chips */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === 'ALL'
                ? 'bg-yellow-500 text-black'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All ({items.length})
          </button>
          {purities.map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                filter === p
                  ? 'bg-yellow-500 text-black'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {p} ({byPurity[p].count})
            </button>
          ))}
        </div>
      )}

      {/* Items list */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center text-gray-500">
          <CubeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p>
            {items.length === 0
              ? 'No stock recorded in this branch.'
              : 'No items match this filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-semibold text-lg">
              {filter === 'ALL' ? 'All Items' : `${filter} Items`} (
              {filteredItems.length})
            </h2>
            <p className="text-sm text-gray-500">
              Total:{' '}
              {filteredItems
                .reduce((s, i) => s + (i.netWeight || 0), 0)
                .toFixed(2)}
              g
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredItems.map((item) => {
              const purity = itemPurity(item);
              const firstImg =
                Array.isArray(item.imageUrls) && item.imageUrls.length > 0
                  ? item.imageUrls[0]
                  : null;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-6 py-4 hover:bg-gray-50 flex gap-4 items-center"
                >
                  {/* Image thumbnail */}
                  <button
                    type="button"
                    onClick={() => firstImg && setPreviewImage(firstImg)}
                    disabled={!firstImg}
                    className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-yellow-400 transition bg-white flex items-center justify-center disabled:cursor-default"
                  >
                    {firstImg ? (
                      <img
                        src={firstImg}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <PhotoIcon className="w-8 h-8 text-gray-300" />
                    )}
                  </button>

                  {/* Item details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">
                        {item.name}
                      </p>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        ×{item.count}
                      </span>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                        {purity}
                      </span>
                    </div>

                    {item.order && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Order #{item.order.id.slice(-6)}
                        {item.order.customer?.name &&
                          ` • ${item.order.customer.name}`}
                        {item.order.agent?.name &&
                          ` • Agent: ${item.order.agent.name}`}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-4 text-xs">
                      <span className="text-gray-500">
                        Gross:{' '}
                        <span className="font-medium text-gray-700">
                          {(item.grossWeight || 0).toFixed(2)}g
                        </span>
                      </span>
                      <span className="text-gray-500">
                        Stone:{' '}
                        <span className="font-medium text-gray-700">
                          {(item.stoneWeight || 0).toFixed(2)}g
                        </span>
                      </span>
                      <span className="text-gray-500">
                        Dust:{' '}
                        <span className="font-medium text-gray-700">
                          {(item.dustWeight || 0).toFixed(2)}g
                        </span>
                      </span>
                      <span className="text-gray-500">
                        Net:{' '}
                        <span className="font-bold text-yellow-700">
                          {(item.netWeight || 0).toFixed(2)}g
                        </span>
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 mt-1">
                      Added {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full-screen image preview */}
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