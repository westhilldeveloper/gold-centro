'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  FireIcon,
  XMarkIcon,
  PhotoIcon,
  CubeIcon,
  CheckCircleIcon,
  ClockIcon,
  RectangleStackIcon,
  PlayIcon,
  XCircleIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import ItemImageCarousel, {
  getImageUrls,
} from '../../components/ItemImageCarousel';

export default function MeltingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('items');

  const [availableItems, setAvailableItems] = useState([]);
  const [mainBranch, setMainBranch] = useState(null);
  const [batches, setBatches] = useState([]);
  const [bars, setBars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [branches, setBranches] = useState([]); 

  const [selectedItems, setSelectedItems] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [detailBatch, setDetailBatch] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // ---- Load ----
  const loadBatches = async () => {
    try {
      const [melRes, brRes] = await Promise.all([
        fetch('/api/admin/melting'),
        fetch('/api/admin/branches'),
      ]);
      const melData = await melRes.json();
      const brData = await brRes.json();
      if (melData.success) {
  setBatches(melData.batches || []);
  setBars(melData.batches?.flatMap((b) => b.bars || []) || []);
}
if (brData.success) {
  setBranches(brData.branches || []);   // ← ADD THIS
}
      // brRes not used for filtering anymore — kept for the batch detail modal
    } catch (err) {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableItems = async () => {
    setItemsLoading(true);
    try {
      const res = await fetch('/api/admin/melting/available-items');
      const d = await res.json();
      if (d.success) {
        setAvailableItems(d.items || []);
        setMainBranch(d.mainBranch || null);
      } else {
        setAvailableItems([]);
      }
    } catch {
      setAvailableItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
    loadAvailableItems();
  }, []);

  // ---- Filter (search only — no branch filter) ----
  const filteredItems = useMemo(() => {
    if (!search) return availableItems;
    const term = search.toLowerCase();
    return availableItems.filter(
      (it) =>
        it.name?.toLowerCase().includes(term) ||
        it.order?.id?.toLowerCase().includes(term) ||
        it.order?.customer?.name?.toLowerCase().includes(term)
    );
  }, [availableItems, search]);

  // ---- Selection ----
  const toggleItem = (id) =>
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleAll = () => {
    if (selectedItems.length === filteredItems.length) setSelectedItems([]);
    else setSelectedItems(filteredItems.map((i) => i.id));
  };

  const selectedObjects = availableItems.filter((i) =>
    selectedItems.includes(i.id)
  );
  const totalNet = selectedObjects.reduce((s, i) => s + i.netWeight, 0);
  const totalGross = selectedObjects.reduce((s, i) => s + i.grossWeight, 0);
  const totalPieces = selectedObjects.reduce((s, i) => s + i.count, 0);

  // ---- Start Melting ----
  const handleStartMelting = async () => {
    if (selectedItems.length === 0)
      return toast.error('Select at least one item');
    if (!user?.id && !user?.userId) return toast.error('User session missing');

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/melting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: selectedItems,
          sentBy: user?.id || user?.userId,
          notes: notes || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(`✅ Batch created • ${selectedItems.length} items`);
      setConfirmOpen(false);
      setNotes('');
      setSelectedItems([]);
      setActiveTab('batches');
      loadBatches();
      loadAvailableItems();
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Stats ----
  const stats = useMemo(() => {
    const pending = batches.filter((b) => b.status === 'PENDING').length;
    const inProgress = batches.filter((b) => b.status === 'IN_PROGRESS').length;
    const completed = batches.filter((b) => b.status === 'COMPLETED').length;
    const totalBarWeight = bars.reduce((s, b) => s + b.weight, 0);
    return {
      pending,
      inProgress,
      completed,
      totalBarWeight,
      barCount: bars.length,
      availableItems: availableItems.length,
    };
  }, [batches, bars, availableItems]);

  const getStatusBadge = (status) => {
    const cfg = {
      PENDING: { c: 'bg-blue-100 text-blue-700', i: ClockIcon, l: 'Pending' },
      IN_PROGRESS: {
        c: 'bg-orange-100 text-orange-700',
        i: FireIcon,
        l: 'Melting',
      },
      COMPLETED: {
        c: 'bg-green-100 text-green-700',
        i: CheckCircleIcon,
        l: 'Completed',
      },
      CANCELLED: {
        c: 'bg-red-100 text-red-700',
        i: XCircleIcon,
        l: 'Cancelled',
      },
    };
    return cfg[status] || cfg.PENDING;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      <Toaster position="top-center" />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <FireIcon className="w-8 h-8 text-orange-600" /> Melting
        </h1>
        <p className="text-gray-500 mt-1">
          Select items from the main branch and start a melting batch
        </p>
      </div>

      {/* Main branch banner */}
      {mainBranch ? (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center flex-shrink-0">
            <BuildingStorefrontIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-orange-700 font-semibold">
              Melting source
            </p>
            <p className="font-semibold text-gray-900">
              {mainBranch.name}{' '}
              <span className="text-xs text-gray-500 font-mono">
                ({mainBranch.code})
              </span>
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          ⚠ No head office branch configured — set one under Branches to enable
          melting.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl shadow-md p-4">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <CubeIcon className="w-3 h-3" /> Available
          </p>
          <p className="text-2xl font-bold mt-1">{stats.availableItems}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-4">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <ClockIcon className="w-3 h-3" /> Pending
          </p>
          <p className="text-2xl font-bold mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-4">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <FireIcon className="w-3 h-3" /> Melting
          </p>
          <p className="text-2xl font-bold mt-1 text-orange-600">
            {stats.inProgress}
          </p>
        </div>
        <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl shadow-md p-4 text-black">
          <p className="text-xs opacity-80 flex items-center gap-1">
            <RectangleStackIcon className="w-3 h-3" /> Gold Bars
          </p>
          <p className="text-2xl font-bold mt-1">{stats.barCount}</p>
          <p className="text-[10px] opacity-80">
            {stats.totalBarWeight.toFixed(2)}g total
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'items'
              ? 'text-yellow-600 border-b-2 border-yellow-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Available Items ({availableItems.length})
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'batches'
              ? 'text-yellow-600 border-b-2 border-yellow-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Melting Batches ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab('bars')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'bars'
              ? 'text-yellow-600 border-b-2 border-yellow-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Gold Bars ({bars.length})
        </button>
      </div>

      {/* ---- ITEMS TAB ---- */}
      {activeTab === 'items' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* Search + Select All */}
          <div className="bg-white rounded-2xl shadow-md p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by item, order, or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-yellow-500 outline-none"
              />
            </div>
            {filteredItems.length > 0 && (
              <button
                onClick={toggleAll}
                className="text-xs text-yellow-600 hover:text-yellow-800 font-medium whitespace-nowrap"
              >
                {selectedItems.length === filteredItems.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            )}
          </div>

          {itemsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md p-12 text-center">
              <CubeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {availableItems.length === 0
                  ? mainBranch
                    ? `No items currently at ${mainBranch.name}.`
                    : 'No items available.'
                  : 'No items match your search.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredItems.map((item) => {
                const isSelected = selectedItems.includes(item.id);
                const images = getImageUrls(item);
                const purity = item.purity || item.order?.purity;

                return (
                  <label
                    key={item.id}
                    className={`bg-white rounded-xl border-2 transition cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'border-orange-400 ring-2 ring-orange-100'
                        : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex gap-3 p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItem(item.id)}
                        className="w-5 h-5 accent-orange-500 mt-1 flex-shrink-0"
                      />

                      <ItemImageCarousel
                        images={images}
                        alt={item.name}
                        onPreview={setPreviewImage}
                        size={72}
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
                            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">
                              {purity}
                            </span>
                          )}
                        </div>

                        {item.order && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            Order #{item.order.id.slice(-6)}
                            {item.order.customer?.name &&
                              ` • ${item.order.customer.name}`}
                          </p>
                        )}

                        <div className="mt-1 flex gap-3 text-xs">
                          <span className="text-gray-500">
                            Gross:{' '}
                            <span className="font-medium text-gray-700">
                              {(item.grossWeight || 0).toFixed(2)}g
                            </span>
                          </span>
                          <span className="text-gray-500">
                            Net:{' '}
                            <span className="font-bold text-orange-700">
                              {(item.netWeight || 0).toFixed(2)}g
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ---- BATCHES TAB ---- */}
      {activeTab === 'batches' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3"
        >
          {batches.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md p-12 text-center">
              <FireIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No melting batches yet.</p>
            </div>
          ) : (
            batches.map((b) => {
              const badge = getStatusBadge(b.status);
              const BadgeIcon = badge.i;
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 hover:shadow-lg transition cursor-pointer"
                  onClick={() => setDetailBatch(b.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-[240px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 ${badge.c}`}
                        >
                          <BadgeIcon className="w-3 h-3" /> {badge.l}
                        </span>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
                          {b.batchCode}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {b.itemIds?.length || 0} item
                          {b.itemIds?.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-medium text-gray-900 flex items-center gap-2">
                        {b.branch?.name || (
                          <span className="text-gray-400 italic">
                            Melting (no storage yet)
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            b.purity === 'MIXED'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {b.purity === 'MIXED' ? 'Mixed Purity' : b.purity}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Input: <strong>{b.totalInputWeight.toFixed(2)}g</strong>{' '}
                        net
                        {b.totalBarWeight > 0 && (
                          <>
                            {' '}
                            • Output:{' '}
                            <strong>{b.totalBarWeight.toFixed(2)}g</strong> in{' '}
                            {b.bars.length} bar(s)
                          </>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Sent {new Date(b.sentAt).toLocaleString()} •{' '}
                        {b.sentByName}
                        {b.handledByName && ` • Handled by ${b.handledByName}`}
                      </p>
                    </div>

                    {b.bars?.length > 0 && (
                      <div className="flex gap-2">
                        {b.bars.slice(0, 3).map((bar) => (
                          <button
                            key={bar.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (bar.imageUrl) setPreviewImage(bar.imageUrl);
                            }}
                            className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white"
                          >
                            {bar.imageUrl ? (
                              <img
                                src={bar.imageUrl}
                                alt={bar.barCode}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <RectangleStackIcon className="w-full h-full p-2 text-gray-300" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      )}

      {/* ---- BARS TAB ---- */}
      {activeTab === 'bars' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {bars.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl shadow-md p-12 text-center">
              <RectangleStackIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No bars yet.</p>
            </div>
          ) : (
            bars.map((bar) => (
              <div
                key={bar.id}
                className="bg-white rounded-2xl shadow-md border border-gray-100 p-3 flex gap-3"
              >
                <button
                  onClick={() => bar.imageUrl && setPreviewImage(bar.imageUrl)}
                  className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 bg-white"
                >
                  {bar.imageUrl ? (
                    <img
                      src={bar.imageUrl}
                      alt={bar.barCode}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <RectangleStackIcon className="w-full h-full p-4 text-gray-300" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded-full inline-block text-gray-700">
                    {bar.barCode}
                  </p>
                  <p className="mt-1 font-bold text-gray-900">
                    {(bar.weight || 0).toFixed(2)}g
                  </p>
                  <p className="text-xs text-gray-500">{bar.purity}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(bar.createdAt).toLocaleDateString()} •{' '}
                    {bar.handledByName || 'N/A'}
                  </p>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* Floating action bar */}
      <AnimatePresence>
        {activeTab === 'items' && selectedItems.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-3xl w-[calc(100%-2rem)]"
          >
            <div className="bg-gray-900 text-white rounded-2xl shadow-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Items
                  </p>
                  <p className="font-bold">
                    {selectedItems.length} • {totalPieces} pc
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Gross
                  </p>
                  <p className="font-bold">{totalGross.toFixed(2)}g</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Net
                  </p>
                  <p className="font-bold text-yellow-400">
                    {totalNet.toFixed(2)}g
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmOpen(true)}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition"
              >
                <FireIcon className="w-5 h-5" /> Start Melting
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm modal */}
      <ConfirmStartModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setNotes('');
        }}
        onSubmit={handleStartMelting}
        submitting={submitting}
        items={selectedObjects}
        notes={notes}
        setNotes={setNotes}
      />

      {/* Batch detail */}
      <BatchDetailModal
        batchId={detailBatch}
        onClose={() => setDetailBatch(null)}
        onUpdated={() => {
          setDetailBatch(null);
          loadBatches();
          loadAvailableItems();
        }}
        userId={user?.id || user?.userId}
        branches={branches}
        onPreviewImage={setPreviewImage}
      />

      {/* Image preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            key="image-preview"
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
    </div>
  );
}

// ============================================
// Confirm Start Melting (unchanged except purity display)
// ============================================
function ConfirmStartModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  items,
  notes,
  setNotes,
}) {
  const totalNet = items.reduce((s, i) => s + i.netWeight, 0);
  const totalGross = items.reduce((s, i) => s + i.grossWeight, 0);
  const totalPieces = items.reduce((s, i) => s + i.count, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FireIcon className="w-5 h-5 text-orange-600" /> Start Melting
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Create a melting batch from {items.length} item
                  {items.length > 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-orange-700">Items</span>
                <span className="font-medium">
                  {items.length} • {totalPieces} pc
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-orange-700">Total Gross</span>
                <span className="font-medium">{totalGross.toFixed(2)}g</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-orange-700">Total Net</span>
                <span className="font-bold text-orange-800">
                  {totalNet.toFixed(2)}g
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Damaged items to be recast"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-orange-500 outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FireIcon className="w-5 h-5" /> Start Melting
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// Batch Detail (unchanged from before)
// ============================================
function BatchDetailModal({
  batchId,
  onClose,
  onUpdated,
  userId,
  branches,
  onPreviewImage,
}) {
  const [batch, setBatch] = useState(null);
  const [items, setItems] = useState([]);
  const [bars, setBars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const load = async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/melting/${batchId}`);
      const d = await res.json();
      if (d.success) {
        setBatch(d.batch);
        setItems(Array.isArray(d.items) ? d.items : d.items?.all || []);
        setBars(d.bars || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [batchId]);

  const startMelting = async () => {
    try {
      const res = await fetch(`/api/admin/melting/${batchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success('🔥 Melting started');
      load();
    } catch (err) {
      toast.error('❌ ' + err.message);
    }
  };

  const cancelBatch = async () => {
    if (!confirm('Cancel this melting batch? Items will return to their branches.'))
      return;
    try {
      const res = await fetch(`/api/admin/melting/${batchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success('Batch cancelled');
      onUpdated();
    } catch (err) {
      toast.error('❌ ' + err.message);
    }
  };

  const completeBatch = async (barData) => {
    const idToUse = batch?.id || batchId;
    if (!idToUse) {
      toast.error('Batch ID missing — please reopen the batch');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/melting/${idToUse}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: barData.weight,
          purity: barData.purity,
          imageUrl: barData.imageUrl,
          handledBy: userId,
          validatedBy: barData.validatedBy || null,
          targetBranchId: barData.targetBranchId,
          notes: barData.notes,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(`✅ Bar ${d.bar.barCode} created • Batch completed`);
      onUpdated();
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {batchId && (
        <motion.div
          key="batch-detail-modal" 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FireIcon className="w-5 h-5 text-orange-600" />
                  {batch?.batchCode || 'Loading...'}
                </h2>
                {batch && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {batch.fromBranchIds?.length || 0} source branch
                    {(batch.fromBranchIds?.length || 0) !== 1 ? 'es' : ''} •{' '}
                    {batch.purity} • {batch.itemIds?.length} item(s)
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !batch ? (
                <p className="text-center text-gray-500 py-8">
                  Batch not found.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">Input</p>
                      <p className="font-bold text-gray-900">
                        {batch.totalInputWeight.toFixed(2)}g
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">Output</p>
                      <p className="font-bold text-green-700">
                        {batch.totalBarWeight.toFixed(2)}g
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">Loss</p>
                      <p className="font-bold text-red-600">
                        {(
                          batch.totalInputWeight - batch.totalBarWeight
                        ).toFixed(2)}
                        g
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 mb-2">
                      Items ({items.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map((it) => {
                        const images = getImageUrls(it);
                        const purity = it.purity || it.order?.purity;
                        return (
                          <div
                            key={it.id}
                            className={`flex gap-2 rounded-xl p-2 border-2 ${
                              it.status === 'MELTED'
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-100'
                            }`}
                          >
                            <ItemImageCarousel
                              images={images}
                              alt={it.name}
                              onPreview={onPreviewImage}
                              size={56}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                <p className="text-sm font-medium truncate">
                                  {it.name}
                                </p>
                                {purity && (
                                  <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">
                                    {purity}
                                  </span>
                                )}
                                {it.status === 'MELTED' && (
                                  <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" />
                                )}
                              </div>
                              <p className="text-[10px] text-gray-500">
                                ×{it.count}
                              </p>
                              <p className="text-xs font-semibold text-orange-700">
                                {(it.netWeight || 0).toFixed(2)}g
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {bars.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-1">
                        <RectangleStackIcon className="w-4 h-4 text-green-600" />
                        Bar Produced
                      </h3>
                      {bars.map((bar) => (
                        <div
                          key={bar.id}
                          className="bg-green-50 rounded-xl p-3 border border-green-200 flex gap-3"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (bar.imageUrl) onPreviewImage(bar.imageUrl);
                            }}
                            className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-green-300 bg-white"
                          >
                            {bar.imageUrl ? (
                              <img
                                src={bar.imageUrl}
                                alt={bar.barCode}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <RectangleStackIcon className="w-full h-full p-4 text-gray-300" />
                            )}
                          </button>
                          <div className="flex-1">
                            <p className="font-mono text-xs text-green-700 font-medium">
                              {bar.barCode}
                            </p>
                            <p className="font-bold text-gray-900 text-lg">
                              {(bar.weight || 0).toFixed(2)}g
                            </p>
                            <p className="text-xs text-gray-600">
                              {bar.purity}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1">
                              By {bar.handledByName || 'N/A'}
                              {bar.validatedBy && ' • Validated'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {batch.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={startMelting}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                      >
                        <PlayIcon className="w-5 h-5" /> Start Melting
                      </button>
                      <button
                        onClick={cancelBatch}
                        className="bg-red-100 hover:bg-red-200 text-red-700 font-medium px-4 py-3 rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {batch.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => setShowCompleteModal(true)}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-2"
                    >
                      <CheckCircleIcon className="w-5 h-5" /> Complete Melting
                    </button>
                  )}

                  {batch.status === 'COMPLETED' && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                      <CheckCircleIcon className="w-8 h-8 text-green-600 mx-auto mb-1" />
                      <p className="font-medium text-green-800">
                        Completed • {bars.length} bar(s) produced
                      </p>
                      <p className="text-xs text-green-700">
                        {new Date(batch.completedAt).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {batch.status === 'CANCELLED' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                      <XCircleIcon className="w-8 h-8 text-red-600 mx-auto mb-1" />
                      <p className="font-medium text-red-800">
                        Batch cancelled
                      </p>
                      <p className="text-xs text-red-700">
                        Items returned to their source branches
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={onClose}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {batch && (
        <CompleteBarModal
          key="complete-bar-modal"
          isOpen={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          onSubmit={completeBatch}
          submitting={submitting}
          batch={batch}
          branches={branches}
          totalInput={
            batch?.totalInputWeight ||
            items.reduce((s, i) => s + i.netWeight, 0)
          }
        />
      )}
    </AnimatePresence>
  );
}

// ============================================
// Complete Bar Modal (unchanged)
// ============================================
function CompleteBarModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  batch,
  branches,
  totalInput,
}) {
  const [weight, setWeight] = useState('');
  const [purity, setPurity] = useState(
    batch?.purity === 'MIXED' ? '24K' : batch?.purity || '24K'
  );
  const [imageUrl, setImageUrl] = useState('');
  const [validatedBy, setValidatedBy] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWeight(totalInput ? totalInput.toFixed(2) : '');
      setPurity(
        batch?.purity === 'MIXED' ? '24K' : batch?.purity || '24K'
      );
      setImageUrl('');
      setValidatedBy('');
      setNotes('');
      const head = branches?.find((b) => b.isHeadOffice);
      setTargetBranchId(head?.id || branches?.[0]?.id || '');
    }
  }, [isOpen, totalInput, batch, branches]);

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append(
        'upload_preset',
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      );
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      setImageUrl(data.secure_url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[95] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-600" /> Complete
              Melting
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Fill in the produced bar details
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bar Weight (g) *
              </label>
              <input
                type="number"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purity
              </label>
              <select
                value={purity}
                onChange={(e) => setPurity(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-green-500 outline-none"
              >
                <option value="24K">24K</option>
                <option value="22K">22K</option>
                <option value="20K">20K</option>
                <option value="18K">18K</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Bar At <span className="text-red-500">*</span>
            </label>
            <select
              value={targetBranchId}
              onChange={(e) => setTargetBranchId(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-green-500 outline-none"
            >
              <option value="">Select branch</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code}){' '}
                  {b.isHeadOffice ? '• Head Office' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Validated By (optional)
            </label>
            <input
              type="text"
              value={validatedBy}
              onChange={(e) => setValidatedBy(e.target.value)}
              placeholder="Name of person who validated"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-green-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bar Photo
            </label>
            {imageUrl ? (
              <div className="relative inline-block">
                <img
                  src={imageUrl}
                  alt="Bar"
                  className="w-32 h-32 object-cover rounded-xl border border-gray-200"
                />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 text-sm text-gray-500 border-2 border-dashed border-gray-300 rounded-xl px-4 py-6 cursor-pointer hover:border-green-400">
                <PhotoIcon className="w-5 h-5" />
                {uploading ? 'Uploading...' : 'Click to upload bar photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImage}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-green-500 outline-none"
            />
          </div>

          {weight && totalInput > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
              💡 Weight loss:{' '}
              <strong>
                {(totalInput - parseFloat(weight || 0)).toFixed(2)}g
              </strong>{' '}
              (
              {((1 - parseFloat(weight || 0) / totalInput) * 100).toFixed(1)}
              %)
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSubmit({
                weight,
                purity,
                imageUrl,
                validatedBy,
                targetBranchId,
                notes,
              })
            }
            disabled={submitting || !weight || !targetBranchId}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" /> Complete & Create Bar
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}