'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PhotoIcon,
  XMarkIcon,
  MapPinIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  UserIcon,
  ClockIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import ItemPipelineModal from '../../components/ItemPipelineModal';
import ItemImageCarousel, {
  getImageUrls,
} from '../../components/ItemImageCarousel';

const LOCATION_STYLES = {
  AT_BRANCH: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: BuildingStorefrontIcon,
  },
  IN_TRANSIT: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    icon: TruckIcon,
  },
  WITH_AGENT: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    icon: UserIcon,
  },
  IN_MELTING: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    icon: ClockIcon,
  },
  MELTED: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    icon: MapPinIcon,
  },
  IN_PROGRESS: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: ClockIcon,
  },
  UNKNOWN: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    icon: MapPinIcon,
  },
};

export default function TrackHistoryPage() {
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [purityFilter, setPurityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [previewImage, setPreviewImage] = useState(null);
  const [pipelineItemId, setPipelineItemId] = useState(null);
  const [view, setView] = useState('grid'); // 'grid' | 'list'

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (branchFilter) params.append('branchId', branchFilter);
      if (purityFilter) params.append('purity', purityFilter);

      const res = await fetch(`/api/admin/track-history?${params}`);
      const d = await res.json();
      if (d.success) {
        setItems(d.items || []);
        if (d.branches) setBranches(d.branches);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, branchFilter, purityFilter]);

  // Apply status filter client-side
  const filteredItems = useMemo(() => {
    if (statusFilter === 'ALL') return items;
    return items.filter((it) => it.locationType === statusFilter);
  }, [items, statusFilter]);

  const stats = useMemo(() => {
    const s = {
      all: items.length,
      AT_BRANCH: 0,
      IN_TRANSIT: 0,
      WITH_AGENT: 0,
      IN_MELTING: 0,
      MELTED: 0,
    };
    items.forEach((it) => {
      if (s[it.locationType] !== undefined) s[it.locationType] += 1;
    });
    return s;
  }, [items]);

  const purities = useMemo(() => {
    const set = new Set();
    items.forEach((it) => {
      const p = it.purity || it.order?.purity;
      if (p) set.add(p);
    });
    return Array.from(set).sort();
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Squares2X2Icon className="w-8 h-8 text-yellow-600" /> Track History
          </h1>
          <p className="text-gray-500 mt-1">
            Search and track every item's current location and journey
          </p>
        </div>

        {/* View toggle */}
        <div className="inline-flex rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition ${
              view === 'grid'
                ? 'bg-yellow-400 text-black'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            title="Grid view"
          >
            <Squares2X2Icon className="w-4 h-4" /> Grid
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition ${
              view === 'list'
                ? 'bg-yellow-400 text-black'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            title="List view"
          >
            <ListBulletIcon className="w-4 h-4" /> List
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`text-left rounded-2xl p-4 transition ${
            statusFilter === 'ALL'
              ? 'bg-yellow-500 text-black shadow-lg'
              : 'bg-white hover:shadow-md'
          }`}
        >
          <p className="text-xs opacity-80 font-medium">Total Items</p>
          <p className="text-2xl font-bold mt-1">{stats.all}</p>
        </button>

        <button
          onClick={() => setStatusFilter('AT_BRANCH')}
          className={`text-left rounded-2xl p-4 transition ${
            statusFilter === 'AT_BRANCH'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-white hover:shadow-md'
          }`}
        >
          <p className="text-xs opacity-80 font-medium flex items-center gap-1">
            <BuildingStorefrontIcon className="w-3 h-3" /> At Branch
          </p>
          <p className="text-2xl font-bold mt-1">{stats.AT_BRANCH}</p>
        </button>

        <button
          onClick={() => setStatusFilter('IN_TRANSIT')}
          className={`text-left rounded-2xl p-4 transition ${
            statusFilter === 'IN_TRANSIT'
              ? 'bg-yellow-600 text-white shadow-lg'
              : 'bg-white hover:shadow-md'
          }`}
        >
          <p className="text-xs opacity-80 font-medium flex items-center gap-1">
            <TruckIcon className="w-3 h-3" /> In Transit
          </p>
          <p className="text-2xl font-bold mt-1">{stats.IN_TRANSIT}</p>
        </button>

        <button
          onClick={() => setStatusFilter('WITH_AGENT')}
          className={`text-left rounded-2xl p-4 transition ${
            statusFilter === 'WITH_AGENT'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white hover:shadow-md'
          }`}
        >
          <p className="text-xs opacity-80 font-medium flex items-center gap-1">
            <UserIcon className="w-3 h-3" /> With Agents
          </p>
          <p className="text-2xl font-bold mt-1">{stats.WITH_AGENT}</p>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-md p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by item name, order, customer, or agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition"
          />
        </div>

        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-yellow-500 outline-none text-sm"
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>

        <select
          value={purityFilter}
          onChange={(e) => setPurityFilter(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-yellow-500 outline-none text-sm"
        >
          <option value="">All Purity</option>
          {purities.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {(search || branchFilter || purityFilter || statusFilter !== 'ALL') && (
          <button
            onClick={() => {
              setSearch('');
              setBranchFilter('');
              setPurityFilter('');
              setStatusFilter('ALL');
            }}
            className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
          >
            <XMarkIcon className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <Squares2X2Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No items found.</p>
          {(search || branchFilter || purityFilter || statusFilter !== 'ALL') && (
            <p className="text-xs text-gray-400 mt-1">
              Try adjusting your filters.
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Showing <strong>{filteredItems.length}</strong> item
            {filteredItems.length > 1 ? 's' : ''}
          </p>

          {/* ---- GRID VIEW ---- */}
          {view === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onOpenPipeline={setPipelineItemId}
                  onPreview={setPreviewImage}
                />
              ))}
            </div>
          )}

          {/* ---- LIST VIEW (image left, one card per row) ---- */}
          {view === 'list' && (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onOpenPipeline={setPipelineItemId}
                  onPreview={setPreviewImage}
                />
              ))}
            </div>
          )}
        </>
      )}

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
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
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

/* ============================================================
   Grid item card
   ============================================================ */
function ItemCard({ item, onOpenPipeline, onPreview }) {
  const style =
    LOCATION_STYLES[item.locationType] || LOCATION_STYLES.UNKNOWN;
  const LocIcon = style.icon;
  const images = getImageUrls(item);
  const purity = item.purity || item.order?.purity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-md border border-gray-100 hover:border-yellow-400 hover:shadow-lg transition overflow-hidden cursor-pointer"
      onClick={() => onOpenPipeline(item.id)}
    >
      <div className="flex gap-3 p-3">
        {/* Image carousel */}
        <ItemImageCarousel
          images={images}
          alt={item.name}
          onPreview={onPreview}
          size={80}
        />

        {/* Details */}
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
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              Order #{item.order.id.slice(-6)}
              {item.order.customer?.name && ` • ${item.order.customer.name}`}
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
              <span className="font-bold text-yellow-700">
                {(item.netWeight || 0).toFixed(2)}g
              </span>
            </span>
          </div>

          <div className="mt-2 flex items-center gap-1">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${style.bg} ${style.text}`}
            >
              <LocIcon className="w-3 h-3" />
              {item.location}
            </span>
          </div>

          <p className="text-[10px] text-blue-500 mt-1.5 font-medium">
            View pipeline →
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================
   List view row — larger image, all details horizontal
   ============================================================ */
function ItemRow({ item, onOpenPipeline, onPreview }) {
  const style =
    LOCATION_STYLES[item.locationType] || LOCATION_STYLES.UNKNOWN;
  const LocIcon = style.icon;
  const images = getImageUrls(item);
  const purity = item.purity || item.order?.purity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-md border border-gray-100 hover:border-yellow-400 hover:shadow-lg transition cursor-pointer"
      onClick={() => onOpenPipeline(item.id)}
    >
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        {/* Bigger image carousel */}
        <ItemImageCarousel
          images={images}
          alt={item.name}
          onPreview={onPreview}
          size={112}
        />

        {/* Details column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{item.name}</p>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              ×{item.count}
            </span>
            {purity && (
              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                {purity}
              </span>
            )}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${style.bg} ${style.text}`}
            >
              <LocIcon className="w-3 h-3" />
              {item.location}
            </span>
          </div>

          {item.order && (
            <p className="text-xs text-gray-500 mt-1">
              Order #{item.order.id.slice(-6)}
              {item.order.customer?.name && ` • ${item.order.customer.name}`}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
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

          <p className="text-[10px] text-blue-500 mt-2 font-medium">
            View full pipeline →
          </p>
        </div>
      </div>
    </motion.div>
  );
}