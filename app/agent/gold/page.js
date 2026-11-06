'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  CubeIcon,
  CheckCircleIcon,
  BuildingStorefrontIcon,
  XMarkIcon,
  UserIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon as XIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import AgentStatCard from '../../components/AgentStatCard';
import ItemImageCarousel, {
  getImageUrls,
} from '../../components/ItemImageCarousel';
import ImagePreview from '../../components/ImagePreview';

const PAGE_SIZE = 10;

export default function AgentGoldPage() {
  const { user } = useAuth();

  // Base data
  const [deposits, setDeposits] = useState([]);
  const [custodyOrders, setCustodyOrders] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pagination + filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  // Modal state
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [depositDetail, setDepositDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Debounce search — 400ms after typing stops
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1); // reset to page 1 on new search
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page when date filters change
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // ---- Load deposit list ----
  const loadDeposits = useCallback(
    async (opts = {}) => {
      if (!user?.id) return;
      const targetPage = opts.page ?? page;
      const firstLoad = !totals;

      if (firstLoad) setLoading(true);
      else setListLoading(true);

      try {
        const params = new URLSearchParams({
          agentId: user.id,
          page: String(targetPage),
          limit: String(PAGE_SIZE),
        });
        if (search) params.set('search', search);
        if (from) params.set('from', from);
        if (to) params.set('to', to);

        const res = await fetch(`/api/agent/deposits?${params.toString()}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        setDeposits(data.deposits || []);
        setCustodyOrders(data.custodyOrders || []);
        setTotals(data.totals || null);

        const pg = data.pagination || {};
        setPage(pg.page || 1);
        setTotalPages(pg.totalPages || 1);
        setTotalDeposits(pg.total || 0);
      } catch (err) {
        toast.error('Failed to load gold status');
      } finally {
        setLoading(false);
        setListLoading(false);
      }
    },
    [user?.id, page, search, from, to, totals]
  );

  // Re-fetch when filters or page change
  useEffect(() => {
    loadDeposits({ page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, page, search, from, to]);

  const goToPage = (p) => {
    if (p < 1 || p > totalPages || p === page) return;
    setPage(p);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  // ---- Deposit detail modal ----
  const openDepositDetail = async (deposit) => {
    setSelectedDeposit(deposit);
    setDetailLoading(true);
    setDepositDetail(null);

    try {
      const res = await fetch(`/api/agent/deposits/${deposit.id}`);
      const data = await res.json();
      if (data.success) setDepositDetail(data);
      else toast.error(data.error || 'Failed to load deposit details');
    } catch (err) {
      toast.error('Failed to load deposit details');
      setSelectedDeposit(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDepositDetail = () => {
    setSelectedDeposit(null);
    setDepositDetail(null);
  };

  if (loading || !totals) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasActiveFilters = search || from || to;

  // ---- Page number generator ----
  const pageNumbers = () => {
    const t = totalPages;
    const c = page;
    const out = [];
    if (t <= 7) {
      for (let i = 1; i <= t; i++) out.push(i);
    } else if (c <= 4) {
      out.push(1, 2, 3, 4, 5, '...', t);
    } else if (c >= t - 3) {
      out.push(1, '...', t - 4, t - 3, t - 2, t - 1, t);
    } else {
      out.push(1, '...', c - 1, c, c + 1, '...', t);
    }
    return out;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Toaster position="top-center" />

      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <CubeIcon className="w-8 h-8 text-yellow-600" /> Gold Status
        </h1>
        <p className="text-gray-500 mt-1">
          Your gold holdings and deposits
        </p>
      </div>

      {/* Summary — always from full dataset */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AgentStatCard
          label="In Custody"
          value={`${totals.custodyTotal.toFixed(2)}g`}
          icon={CubeIcon}
          color="purple"
          subtitle={`${totals.custodyCount} orders pending deposit`}
        />
        <AgentStatCard
          label="Deposited to Branch"
          value={`${totals.depositedTotal.toFixed(2)}g`}
          icon={CheckCircleIcon}
          color="green"
          subtitle={`${totals.depositCount} deposits total`}
        />
      </div>

      {/* Custody hint */}
      {custodyOrders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">
            🏦 You are holding {totals.custodyTotal.toFixed(2)}g of purchased
            gold
          </p>
          <p>
            Please hand over the gold to your assigned branch. The branch staff
            will verify the items and confirm the deposit on their end.
          </p>
        </div>
      )}

      {/* In custody list */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <CubeIcon className="w-5 h-5 text-purple-600" /> Currently in Custody
        </h2>
        {custodyOrders.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">
            No gold currently held. All purchases have been deposited.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {Object.entries(totals.custodyByPurity).map(
                ([purity, weight]) => (
                  <div
                    key={purity}
                    className="bg-purple-50 rounded-xl p-3 border border-purple-100"
                  >
                    <p className="text-xs text-purple-600 font-medium">
                      {purity}
                    </p>
                    <p className="text-lg font-bold text-purple-800">
                      {weight.toFixed(2)}g
                    </p>
                  </div>
                )
              )}
            </div>
            <div className="divide-y divide-gray-100">
              {custodyOrders.map((o) => (
                <div
                  key={o.id}
                  className="py-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-mono text-xs text-gray-400">
                      #{o.id.slice(-8)}
                    </p>
                    <p className="text-sm font-medium">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{o.weight}g</p>
                    <p className="text-xs text-gray-500">
                      {o.purity} • ₹{o.finalPrice?.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Deposit history — paginated + searchable */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <BuildingStorefrontIcon className="w-5 h-5 text-green-600" />
            Deposit History
            <span className="text-sm font-normal text-gray-500">
              ({totalDeposits} total)
            </span>
          </h2>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition ${
              filtersOpen || hasActiveFilters
                ? 'border-yellow-400 bg-yellow-50 text-yellow-800'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FunnelIcon className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-full font-bold">
                ON
              </span>
            )}
          </button>
        </div>

        {/* Search + filters */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by deposit #, branch name, or notes…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-yellow-500 outline-none"
            />
          </div>

          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1"
            >
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  From date
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-yellow-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  To date
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-yellow-500 outline-none text-sm"
                />
              </div>
            </motion.div>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
            >
              <XIcon className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>

        {/* By-purity chips — computed from full dataset */}
        {totals.depositCount > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {Object.entries(totals.depositedByPurity).map(
              ([purity, weight]) => (
                <div
                  key={purity}
                  className="bg-green-50 rounded-xl p-3 border border-green-100"
                >
                  <p className="text-xs text-green-600 font-medium">
                    {purity}
                  </p>
                  <p className="text-lg font-bold text-green-800">
                    {weight.toFixed(2)}g
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {/* Deposit list */}
        {listLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : deposits.length === 0 ? (
          <div className="py-12 text-center">
            <BuildingStorefrontIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">
              {hasActiveFilters
                ? 'No deposits match your filters.'
                : 'No deposits yet.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {deposits.map((d) => (
              <button
                key={d.id}
                onClick={() => openDepositDetail(d)}
                className="w-full text-left py-3 px-2 -mx-2 rounded-lg hover:bg-green-50/50 transition flex justify-between items-center group"
              >
                <div>
                  <p className="font-mono text-xs text-gray-400">
                    #{d.id.slice(-8)}
                  </p>
                  <p className="text-sm font-medium">
                    {d.branch?.name} ({d.branch?.code})
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(d.depositedAt).toLocaleString()} •{' '}
                    {d.orderIds.length} order(s)
                  </p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="font-bold text-green-700">
                      {d.weight.toFixed(2)}g
                    </p>
                    <p className="text-xs text-gray-500">{d.purity}</p>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-green-600" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !listLoading && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Showing{' '}
              <strong>
                {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, totalDeposits)}
              </strong>{' '}
              of <strong>{totalDeposits}</strong>
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-4 h-4" /> Prev
              </button>
              {pageNumbers().map((p, i) =>
                p === '...' ? (
                  <span
                    key={`e-${i}`}
                    className="px-2 py-1.5 text-sm text-gray-400 select-none"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`min-w-[34px] px-2.5 py-1.5 rounded-lg text-sm font-medium transition ${
                      p === page
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black'
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
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- Deposit detail modal (unchanged) ---- */}
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
                    <CheckCircleIcon className="w-5 h-5" />
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
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {detailLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !depositDetail ? (
                  <p className="text-center text-gray-500 py-8">
                    Failed to load details.
                  </p>
                ) : (
                  <>
                    {/* Summary */}
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

                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <BuildingStorefrontIcon className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-900">
                          {depositDetail.deposit.branch?.name} (
                          {depositDetail.deposit.branch?.code})
                        </span>
                      </div>
                      <span className="text-xs text-blue-700">
                        {new Date(
                          depositDetail.deposit.depositedAt
                        ).toLocaleString()}
                      </span>
                    </div>

                    {/* Orders + items */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                        Orders & Items
                      </p>
                      <div className="space-y-4">
                        {depositDetail.orders.map((order) => (
                          <div
                            key={order.id}
                            className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
                          >
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap justify-between items-center gap-2">
                              <div>
                                <p className="font-mono text-xs text-gray-500">
                                  Order #{order.id.slice(-8).toUpperCase()}
                                </p>
                                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 mt-0.5">
                                  <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                                  {order.customer?.name || 'Unknown'}
                                  {order.customer?.phone && (
                                    <span className="text-gray-500 font-normal">
                                      ({order.customer.phone})
                                    </span>
                                  )}
                                </div>
                              </div>
                              {order.finalPrice && (
                                <span className="text-sm font-bold text-green-700">
                                  ₹{order.finalPrice.toFixed(2)}
                                </span>
                              )}
                            </div>

                            <div className="p-3 space-y-2">
                              {order.items.map((item) => {
                                const images = getImageUrls(item);
                                return (
                                  <div
                                    key={item.id}
                                    className="flex gap-3 bg-gray-50 rounded-xl p-2.5 border border-gray-100"
                                  >
                                    <ItemImageCarousel
                                      images={images}
                                      alt={item.name}
                                      onPreview={setPreviewImage}
                                      size={56}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="font-medium text-sm text-gray-900 truncate">
                                            {item.name}
                                          </p>
                                          {item.purity && (
                                            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">
                                              {item.purity}
                                            </span>
                                          )}
                                          <span className="text-xs text-gray-500">
                                            ×{item.count}
                                          </span>
                                        </div>
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
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={closeDepositDetail}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2.5 px-6 rounded-xl transition"
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