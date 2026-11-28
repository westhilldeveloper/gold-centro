// app/branch/stock/page.js (or wherever this component lives)
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
const itemPurity = (item) => item.purity || item.order?.purity || 'Unknown';

export default function BranchStock() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [byPurity, setByPurity] = useState({});
  const [inTransitItems, setInTransitItems] = useState([]);
  const [inTransitByPurity, setInTransitByPurity] = useState({});
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [filter, setFilter] = useState('ALL');

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

  const filteredItems = useMemo(() => {
    if (filter === 'ALL') return items;
    return items.filter((it) => itemPurity(it) === filter);
  }, [items, filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const purities = Object.keys(byPurity);
  const totalNet = purities.reduce((s, p) => s + byPurity[p].netWeight, 0);
  const totalGross = purities.reduce((s, p) => s + byPurity[p].grossWeight, 0);
  const totalPieces = purities.reduce((s, p) => s + byPurity[p].totalPieces, 0);
  const inTransitTotal = inTransitItems.reduce((s, it) => s + (it.netWeight || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
          <CubeIcon className="w-7 h-7 text-slate-400" /> Inventory Stock
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Current gold holdings in this branch
        </p>
      </div>

      {/* Summary Card - Clean & Bordered */}
      <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-amber-500 shadow-sm p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Total Net Stock
            </p>
            <p className="text-4xl font-bold text-slate-900 mt-2">
              {totalNet.toFixed(3)} <span className="text-2xl text-slate-400 font-normal">g</span>
            </p>
          </div>
          
          <div className="flex gap-8 md:gap-12 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Gross</p>
              <p className="text-lg font-semibold text-slate-900 mt-1">{totalGross.toFixed(3)}g</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Pieces</p>
              <p className="text-lg font-semibold text-slate-900 mt-1">{totalPieces}</p>
            </div>
            {inTransitTotal > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">In Transit</p>
                <p className="text-lg font-semibold text-amber-600 mt-1">+{inTransitTotal.toFixed(3)}g</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-Transit Alert - Softened */}
      {inTransitItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
          <TruckIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 text-sm">
              {inTransitItems.length} item(s) in transit to this branch
            </p>
            <p className="text-sm text-amber-700 mt-1">
              {Object.entries(inTransitByPurity).map(([p, v], idx) => (
                <span key={p}>
                  {idx > 0 && ' • '}
                  <strong>{p}</strong>: {(v.netWeight || 0).toFixed(2)}g ({v.count} items)
                </span>
              ))}
            </p>
            <p className="text-xs text-amber-600 mt-2">
              Mark movements as received in the Movements tab to add them to your stock.
            </p>
          </div>
        </div>
      )}

      {/* Purity summary cards */}
      {purities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {purities.map((purity) => {
            const v = byPurity[purity];
            return (
              <motion.div
                key={purity}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {purity} Gold
                    </p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {(v.netWeight || 0).toFixed(2)}<span className="text-lg text-slate-400 font-normal ml-1">g</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Pieces</p>
                    <p className="text-xl font-semibold text-slate-700 mt-1">
                      {v.totalPieces}
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between text-xs">
                  <span className="text-slate-500">
                    Gross: <span className="font-medium text-slate-700">{(v.grossWeight || 0).toFixed(2)}g</span>
                  </span>
                  <span className="text-slate-500">
                    Items: <span className="font-medium text-slate-700">{v.count}</span>
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Filter chips - High Contrast Minimal */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              filter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All ({items.length})
          </button>
          {purities.map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                filter === p
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p} ({byPurity[p].count})
            </button>
          ))}
        </div>
      )}

      {/* Items list */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <CubeIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {items.length === 0
              ? 'No stock recorded in this branch.'
              : 'No items match this filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-semibold text-slate-900">
              {filter === 'ALL' ? 'All Stock Items' : `${filter} Items`} <span className="text-slate-400 font-normal ml-1">({filteredItems.length})</span>
            </h2>
            <p className="text-sm font-medium text-slate-600">
              Total: {filteredItems.reduce((s, i) => s + (i.netWeight || 0), 0).toFixed(3)}g
            </p>
          </div>
          <div className="divide-y divide-slate-100">
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
                  className="px-6 py-5 hover:bg-slate-50/80 transition-colors flex gap-5 items-start"
                >
                  {/* Image thumbnail */}
                  <button
                    type="button"
                    onClick={() => firstImg && setPreviewImage(firstImg)}
                    disabled={!firstImg}
                    className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-slate-200 hover:border-amber-400 transition-colors bg-slate-50 flex items-center justify-center disabled:cursor-default"
                  >
                    {firstImg ? (
                      <img
                        src={firstImg}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <PhotoIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </button>

                  {/* Item details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 text-base">
                        {item.name}
                      </p>
                      <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                        Qty: {item.count}
                      </span>
                      <span className="text-[11px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
                        {purity}
                      </span>
                    </div>

                    {item.order && (
                      <p className="text-xs text-slate-500 mt-1">
                        Order <span className="font-mono text-slate-700">#{item.order.id.slice(-6).toUpperCase()}</span>
                        {item.order.customer?.name && ` • ${item.order.customer.name}`}
                        {item.order.agent?.name && ` • Agent: ${item.order.agent.name}`}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <span className="text-slate-500 text-xs">
                        Gross: <span className="font-medium text-slate-700">{(item.grossWeight || 0).toFixed(2)}g</span>
                      </span>
                      <span className="text-slate-500 text-xs">
                        Stone: <span className="font-medium text-slate-700">{(item.stoneWeight || 0).toFixed(2)}g</span>
                      </span>
                      <span className="text-slate-500 text-xs">
                        Dust: <span className="font-medium text-slate-700">{(item.dustWeight || 0).toFixed(2)}g</span>
                      </span>
                      <span className="text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded">
                        Net: <span className="font-bold text-slate-900">{(item.netWeight || 0).toFixed(2)}g</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-2 uppercase tracking-wide">
                      Added {new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
            className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-12"
            onClick={() => setPreviewImage(null)}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <img
              src={previewImage}
              alt="Stock Item Preview"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}