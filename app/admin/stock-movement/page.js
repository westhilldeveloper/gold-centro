// D:\gold-centro\app\admin\stock-movement\page.js
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import ItemPipelineModal from '../../components/ItemPipelineModal';
import {
  ArrowsRightLeftIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  PhotoIcon,
  CubeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightIcon,
  UserCircleIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import MovementHandoverSheet from '../../components/MovementHandoverSheet';
import { downloadHandoverSheet } from '../../../lib/downloadHandoverSheet';

export default function AdminStockMovementPage() {
  const { user } = useAuth();
  const [movements, setMovements] = useState([]);
  const [itemsMap, setItemsMap] = useState({});
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [expandedPathKey, setExpandedPathKey] = useState(null);
  const [pipelineItemId, setPipelineItemId] = useState(null);
  const [sheetData, setSheetData] = useState(null); // { movement, items }
  const [downloadingSheet, setDownloadingSheet] = useState(null); // movementId
  const [uploadingSheet, setUploadingSheet] = useState({}); // { [movementId]: bool }
  const sheetRef = useRef(null);

  const fetchData = async () => {
    try {
      const [movRes, brRes] = await Promise.all([
        fetch('/api/admin/stock-movements'),
        fetch('/api/admin/branches'),
      ]);
      const movData = await movRes.json();
      const brData = await brRes.json();
      if (movData.success) {
        setMovements(movData.movements || []);
        setItemsMap(movData.itemsMap || {});
      }
      if (brData.success) setBranches(brData.branches);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
  if (!sheetData) return;
  const run = async () => {
    await new Promise((r) => requestAnimationFrame(r));
    if (!sheetRef.current) return;
    try {
      await downloadHandoverSheet(sheetRef.current, sheetData.movement);
      toast.success('📄 Handover sheet downloaded');
    } catch (err) {
      toast.error('Download failed: ' + err.message);
    } finally {
      setSheetData(null);
      setDownloadingSheet(null);
    }
  };
  run();
}, [sheetData]);
  // ============================================
  // GROUP ITEMS BY THEIR UNIQUE PATH
  // ============================================
  const pathGroups = useMemo(() => {
    if (!movements.length) return [];

    const itemMovements = {};
    movements.forEach((m) => {
      (m.itemIds || []).forEach((id) => {
        if (!itemMovements[id]) itemMovements[id] = [];
        itemMovements[id].push(m);
      });
    });

    const itemPaths = {};
    Object.entries(itemMovements).forEach(([itemId, movs]) => {
      movs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const first = movs[0];
      const latest = movs[movs.length - 1];

      const path = [];
      if (first.fromBranch) path.push(first.fromBranch);
      movs.forEach((m) => {
        if (m.toBranch) path.push(m.toBranch);
      });

      const pathKey = path.map((b) => b.id).join('>');
      if (!itemPaths[pathKey]) {
        itemPaths[pathKey] = {
          pathKey,
          path,
          itemIds: [],
          hopCount: movs.length,
          latestMovement: latest,
          firstMovement: first,
          hasInTransit: false,
        };
      }
      itemPaths[pathKey].itemIds.push(itemId);
      if (latest.status === 'IN_TRANSIT') {
        itemPaths[pathKey].hasInTransit = true;
      }
    });

    const groups = Object.values(itemPaths);
    groups.sort(
      (a, b) =>
        new Date(b.latestMovement.createdAt).getTime() -
        new Date(a.latestMovement.createdAt).getTime()
    );

    return groups;
  }, [movements]);

  const markPathReceived = async (group) => {
    const receiverName = prompt(
      'Name of person receiving the gold?',
      user?.name || ''
    );
    if (!receiverName || !receiverName.trim()) return;

    try {
      const inTransitMovementIds = new Set();
      group.itemIds.forEach((id) => {
        const m = movements.find(
          (mv) => (mv.itemIds || []).includes(id) && mv.status === 'IN_TRANSIT'
        );
        if (m) inTransitMovementIds.add(m.id);
      });

      for (const mid of inTransitMovementIds) {
        const res = await fetch(`/api/admin/stock-movements/${mid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'RECEIVED',
            receivedBy: user.id,
            receivedByName: receiverName.trim(),
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error);
        }
      }

      toast.success('✅ Marked as received');
      fetchData();
    } catch (err) {
      toast.error('❌ ' + err.message);
    }
  };

  const handleDownloadSheet = async (group) => {
  const movement = group.latestMovement;
  if (!movement) return;
  setDownloadingSheet(movement.id);
  try {
    const res = await fetch(
      `/api/admin/stock-movements/${movement.id}/items`
    );
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    setSheetData({ movement, items: data.items || [] });
  } catch (err) {
    toast.error('Failed to prepare sheet: ' + err.message);
    setDownloadingSheet(null);
  }
};

const handleUploadSheet = async (movementId, file) => {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    toast.error('File too large. Max 10 MB.');
    return;
  }

  setUploadingSheet((p) => ({ ...p, [movementId]: true }));
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append(
      'upload_preset',
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    );

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
      { method: 'POST', body: formData }
    );
    const cloudData = await cloudRes.json();
    if (!cloudRes.ok) {
      throw new Error(cloudData.error?.message || 'Cloudinary upload failed');
    }

    const res = await fetch(
      `/api/admin/stock-movements/${movementId}/handover-sheet`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cloudData.secure_url,
          uploadedBy: user.id,
          uploadedByName: user.name,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    toast.success('✅ Signed handover sheet uploaded');
    fetchData();
  } catch (err) {
    toast.error('❌ ' + err.message);
  } finally {
    setUploadingSheet((p) => ({ ...p, [movementId]: false }));
  }
};

  const getStatusBadge = (status) => {
    const config = {
      IN_TRANSIT: {
        color: 'bg-yellow-100 text-yellow-700',
        icon: TruckIcon,
        label: 'In Transit',
      },
      RECEIVED: {
        color: 'bg-green-100 text-green-700',
        icon: CheckCircleIcon,
        label: 'Received',
      },
      PENDING: {
        color: 'bg-blue-100 text-blue-700',
        icon: ClockIcon,
        label: 'Pending',
      },
      CANCELLED: {
        color: 'bg-red-100 text-red-700',
        icon: XMarkIcon,
        label: 'Cancelled',
      },
    };
    return config[status] || config.PENDING;
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

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowsRightLeftIcon className="w-8 h-8 text-yellow-600" /> Stock
            Movement
          </h1>
          <p className="text-gray-500 mt-1">
            Track gold movements between branches and head office
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-lg"
        >
          <PlusIcon className="w-5 h-5" /> New Movement
        </button>
      </div>

      {pathGroups.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <ArrowsRightLeftIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No stock movements recorded.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pathGroups.map((g) => {
            const items = g.itemIds.map((id) => itemsMap[id]).filter(Boolean);
            const totalNet = items.reduce((s, it) => s + (it.netWeight || 0), 0);
            const totalGross = items.reduce(
              (s, it) => s + (it.grossWeight || 0),
              0
            );
            const purity = items[0]?.order?.purity || '';
            const badge = getStatusBadge(g.latestMovement.status);
            const BadgeIcon = badge.icon;
            const isExpanded = expandedPathKey === g.pathKey;

            const m = g.latestMovement;
            const hasPeople =
              m.handedOverByName || m.carrierName || m.receivedByName;

            return (
              <div
                key={g.pathKey}
                className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden"
              >
                <div className="px-6 py-4">
                  {/* Top badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${badge.color}`}
                    >
                      <BadgeIcon className="w-3 h-3" /> {badge.label}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
                      {items.length} item{items.length > 1 ? 's' : ''}
                    </span>
                    {g.hopCount > 1 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                        {g.hopCount} hops
                      </span>
                    )}
                  </div>

                  {/* Path */}
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    {g.path.map((branch, idx) => (
                      <div
                        key={`${g.pathKey}-path-${idx}`}
                        className="flex items-center gap-1.5"
                      >
                        <span
                          className={`text-sm font-semibold ${
                            idx === 0
                              ? 'text-gray-600'
                              : idx === g.path.length - 1
                              ? 'text-yellow-700'
                              : 'text-gray-800'
                          }`}
                        >
                          {branch.name}
                          <span className="text-[10px] text-gray-400 font-mono ml-1">
                            {branch.code}
                          </span>
                        </span>
                        {idx < g.path.length - 1 && (
                          <ArrowRightIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Weight + Date */}
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-semibold text-gray-900">
                      {totalNet.toFixed(2)}g
                    </span>{' '}
                    <span className="text-gray-500">({purity})</span>
                    <span className="text-xs text-gray-400 ml-2">
                      • Gross {totalGross.toFixed(2)}g
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Started{' '}
                    {new Date(g.firstMovement.createdAt).toLocaleString()}
                    {g.hopCount > 1 && (
                      <>
                        {' '}
                        • Last hop{' '}
                        {new Date(g.latestMovement.createdAt).toLocaleString()}
                      </>
                    )}
                  </p>

                  {/* People chain */}
                  {hasPeople && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                          Handed over by
                        </p>
                        <p className="font-medium text-gray-900 mt-0.5 truncate">
                          {m.handedOverByName || '—'}
                        </p>
                        {m.handedOverByPhone && (
                          <p className="text-gray-500 truncate">
                            {m.handedOverByPhone}
                          </p>
                        )}
                      </div>

                      <div className="bg-yellow-50 rounded-lg p-2.5 border border-yellow-100">
                        <p className="text-[10px] uppercase tracking-wider text-yellow-700 font-semibold">
                          Carried by
                        </p>
                        <p className="font-medium text-gray-900 mt-0.5 truncate">
                          {m.carrierName || '—'}
                          {m.carrierType && (
                            <span className="ml-1 text-[10px] text-yellow-700 font-normal">
                              ({m.carrierType})
                            </span>
                          )}
                        </p>
                        {m.carrierPhone && (
                          <p className="text-gray-500 truncate">
                            {m.carrierPhone}
                          </p>
                        )}
                      </div>

                      <div className="bg-green-50 rounded-lg p-2.5 border border-green-100">
                        <p className="text-[10px] uppercase tracking-wider text-green-700 font-semibold">
                          Received by
                        </p>
                        <p className="font-medium text-gray-900 mt-0.5 truncate">
                          {m.receivedByName || '—'}
                        </p>
                        {m.receivedAt && (
                          <p className="text-gray-500 truncate">
                            {new Date(m.receivedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                 
<div className="mt-3 flex flex-wrap gap-2">
  {items.length > 0 && (
    <button
      onClick={() => setExpandedPathKey(isExpanded ? null : g.pathKey)}
      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition"
    >
      {isExpanded ? (
        <>
          <ChevronUpIcon className="w-4 h-4" /> Hide Items
        </>
      ) : (
        <>
          <ChevronDownIcon className="w-4 h-4" /> View {items.length} item
          {items.length > 1 ? 's' : ''}
        </>
      )}
    </button>
  )}

  <button
    onClick={() => handleDownloadSheet(g)}
    disabled={downloadingSheet === m.id}
    className="text-sm text-gray-700 hover:text-black flex items-center gap-1 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition disabled:opacity-50"
  >
    <ArrowDownTrayIcon className="w-4 h-4" />
    {downloadingSheet === m.id ? 'Preparing…' : 'Handover Sheet'}
  </button>

  {g.hasInTransit && (
    <button
      onClick={() => markPathReceived(g)}
      className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-1"
    >
      <CheckCircleIcon className="w-4 h-4" /> Confirm Received
    </button>
  )}
</div>

{/* Signed sheet status / upload */}
<div className="mt-3 pt-3 border-t border-gray-100">
  {m.handoverSheetUrl ? (
    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
      <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-green-800">
          Signed handover sheet uploaded
        </p>
        <p className="text-xs text-green-600">
          {m.handoverSheetUploadedByName
            ? `By ${m.handoverSheetUploadedByName}`
            : ''}
          {m.handoverSheetUploadedAt
            ? ` • ${new Date(m.handoverSheetUploadedAt).toLocaleString()}`
            : ''}
        </p>
      </div>
      <a
        href={m.handoverSheetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-green-700 underline font-medium hover:text-green-900 whitespace-nowrap"
      >
        View
      </a>
    </div>
  ) : (
    <label
      className={`flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 rounded-xl px-4 py-3 cursor-pointer transition ${
        uploadingSheet[m.id] ? 'opacity-60' : ''
      }`}
    >
      {uploadingSheet[m.id] ? (
        <>
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-blue-700">
            Uploading…
          </span>
        </>
      ) : (
        <>
          <DocumentArrowUpIcon className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">
            Upload signed handover sheet (photo or PDF)
          </span>
        </>
      )}
      <input
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        disabled={!!uploadingSheet[m.id]}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadSheet(m.id, file);
          e.target.value = '';
        }}
      />
    </label>
  )}
</div>
                </div>

                {/* Expanded items */}
                <AnimatePresence>
                  {isExpanded && items.length > 0 && (
                    <motion.div
                      key={`expanded-${g.pathKey}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="border-t border-gray-100 bg-gray-50 overflow-hidden"
                    >
                      <div className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {items.map((item) => {
                            const firstImg =
                              Array.isArray(item.imageUrls) &&
                              item.imageUrls.length > 0
                                ? item.imageUrls[0]
                                : null;
                            return (
                              <div
                                key={item.id}
                                className="flex gap-3 bg-white rounded-xl p-3 border border-gray-100 hover:border-yellow-400 hover:shadow-md transition cursor-pointer"
                                onClick={() => setPipelineItemId(item.id)}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (firstImg) setPreviewImage(firstImg);
                                  }}
                                  disabled={!firstImg}
                                  className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-yellow-400 transition bg-white flex items-center justify-center disabled:cursor-default"
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
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-gray-900 text-sm truncate">
                                      {item.name}
                                    </p>
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                      ×{item.count}
                                    </span>
                                  </div>
                                  {item.order && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Order #{item.order.id.slice(-6)} •{' '}
                                      {item.purity || item.order.purity}
                                    </p>
                                  )}
                                  <div className="mt-1 space-y-0.5 text-xs">
                                    <p>
                                      <span className="text-gray-400">
                                        Gross:
                                      </span>{' '}
                                      <span className="font-medium">
                                        {item.grossWeight?.toFixed(2)}g
                                      </span>
                                    </p>
                                    <p>
                                      <span className="text-gray-400">
                                        Net:
                                      </span>{' '}
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
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* New Movement Modal */}
      <NewMovementModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          fetchData();
        }}
        branches={branches}
        userId={user?.id}
        onPreviewImage={setPreviewImage}
      />

      {/* Image Preview */}
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

      {sheetData && (
  <div
    aria-hidden="true"
    style={{
      position: 'fixed',
      left: '-10000px',
      top: 0,
      pointerEvents: 'none',
    }}
  >
    <MovementHandoverSheet
      ref={sheetRef}
      movement={sheetData.movement}
      items={sheetData.items}
    />
  </div>
)}
    </div>

    
  );
}

// ============================================
// New Movement Modal
// ============================================
function NewMovementModal({
  isOpen,
  onClose,
  onCreated,
  branches,
  userId,
  onPreviewImage,
}) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // People chain
  const [agents, setAgents] = useState([]);
  const [handedOverByName, setHandedOverByName] = useState('');
  const [handedOverByPhone, setHandedOverByPhone] = useState('');
  const [carrierType, setCarrierType] = useState('AGENT');
  const [carrierId, setCarrierId] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [carrierPhone, setCarrierPhone] = useState('');

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setFromBranchId('');
      setToBranchId('');
      setDescription('');
      setReference('');
      setSelected([]);
      setHandedOverByName('');
      setHandedOverByPhone('');
      setCarrierType('AGENT');
      setCarrierId('');
      setCarrierName('');
      setCarrierPhone('');

      fetch('/api/users/agents')
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setAgents(d.agents || []);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Load items when source branch chosen
  useEffect(() => {
    if (!isOpen) return;
    setSelected([]);
    if (!fromBranchId) {
      setItems([]);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/stock-items?branchId=${fromBranchId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.items)) setItems(d.items);
        else setItems([]);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [isOpen, fromBranchId]);

  const toggleItem = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selected.length === items.length) setSelected([]);
    else setSelected(items.map((i) => i.id));
  };

  const handleCarrierAgentChange = (id) => {
    setCarrierId(id);
    const a = agents.find((x) => x.id === id);
    if (a) {
      setCarrierName(a.name || '');
      setCarrierPhone(a.phone || '');
    }
  };

  const selectedItems = items.filter((i) => selected.includes(i.id));
  const totalNet = selectedItems.reduce((s, i) => s + i.netWeight, 0);
  const totalGross = selectedItems.reduce((s, i) => s + i.grossWeight, 0);
  const totalCount = selectedItems.reduce((s, i) => s + i.count, 0);

  const handleSubmit = async () => {
    if (!fromBranchId) {
      toast.error('Select source branch');
      return;
    }
    if (!toBranchId) {
      toast.error('Select destination branch');
      return;
    }
    if (fromBranchId === toBranchId) {
      toast.error('Source and destination must differ');
      return;
    }
    if (selected.length === 0) {
      toast.error('Select at least one item');
      return;
    }
    if (!handedOverByName.trim()) {
      toast.error('Enter who handed over the gold');
      return;
    }
    if (!carrierName.trim()) {
      toast.error('Enter who is carrying the gold');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromBranchId,
          toBranchId,
          itemIds: selected,
          description: description || null,
          reference: reference || null,
          createdBy: userId,
          handedOverByName: handedOverByName.trim() || null,
          handedOverByPhone: handedOverByPhone.trim() || null,
          carrierType,
          carrierId: carrierId || null,
          carrierName: carrierName.trim(),
          carrierPhone: carrierPhone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('✅ Movement created!');
      onCreated();
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold">New Stock Movement</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select source branch, items, and destination
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
                    From Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fromBranchId}
                    onChange={(e) => setFromBranchId(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
                  >
                    <option value="">Select source</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={toBranchId}
                    onChange={(e) => setToBranchId(e.target.value)}
                    disabled={!fromBranchId}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none disabled:bg-gray-50"
                  >
                    <option value="">Select destination</option>
                    {branches
                      .filter((b) => b.id !== fromBranchId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {fromBranchId && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-gray-700">
                      Available Items ({items.length})
                    </p>
                    {items.length > 0 && (
                      <button
                        onClick={toggleAll}
                        className="text-xs text-yellow-600 hover:text-yellow-800 font-medium"
                      >
                        {selected.length === items.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    )}
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <CubeIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">
                        No items currently in this branch.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {items.map((item) => {
                        const isSelected = selected.includes(item.id);
                        const firstImg =
                          Array.isArray(item.imageUrls) &&
                          item.imageUrls.length > 0
                            ? item.imageUrls[0]
                            : null;
                        return (
                          <label
                            key={item.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                              isSelected
                                ? 'border-yellow-400 bg-yellow-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItem(item.id)}
                              className="w-4 h-4 accent-yellow-500"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                if (firstImg) onPreviewImage(firstImg);
                              }}
                              className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-white"
                            >
                              {firstImg ? (
                                <img
                                  src={firstImg}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <PhotoIcon className="w-full h-full p-3 text-gray-300" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-gray-900 text-sm truncate">
                                  {item.name}
                                </p>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  ×{item.count}
                                </span>
                              </div>
                              {item.order && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Order #{item.order.id.slice(-6)} •{' '}
                                  {item.purity || item.order.purity}
                                </p>
                              )}
                              <div className="flex gap-3 text-xs mt-1">
                                <span className="text-gray-500">
                                  Gross:{' '}
                                  <span className="font-medium text-gray-700">
                                    {item.grossWeight.toFixed(2)}g
                                  </span>
                                </span>
                                <span className="text-gray-500">
                                  Net:{' '}
                                  <span className="font-medium text-yellow-700">
                                    {item.netWeight.toFixed(2)}g
                                  </span>
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {selected.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Items</p>
                    <p className="font-bold text-gray-900">{totalCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Gross</p>
                    <p className="font-bold text-gray-900">
                      {totalGross.toFixed(2)}g
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Net</p>
                    <p className="font-bold text-yellow-700">
                      {totalNet.toFixed(2)}g
                    </p>
                  </div>
                </div>
              )}

              {/* People chain */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <UserCircleIcon className="w-4 h-4 text-gray-500" /> Handover
                  &amp; Carrier
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Handed over by <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={handedOverByName}
                      onChange={(e) => setHandedOverByName(e.target.value)}
                      placeholder="Person releasing the gold"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Handover phone
                    </label>
                    <input
                      type="tel"
                      value={handedOverByPhone}
                      onChange={(e) => setHandedOverByPhone(e.target.value)}
                      placeholder="Optional"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Carried by <span className="text-red-500">*</span>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {['AGENT', 'STAFF', 'COURIER', 'OTHER'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCarrierType(t)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                          carrierType === t
                            ? 'bg-yellow-400 text-black'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {carrierType === 'AGENT' && (
                    <select
                      value={carrierId}
                      onChange={(e) => handleCarrierAgentChange(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
                    >
                      <option value="">Select an agent</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.phone})
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={carrierName}
                      onChange={(e) => setCarrierName(e.target.value)}
                      placeholder="Carrier name"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
                    />
                    <input
                      type="tel"
                      value={carrierPhone}
                      onChange={(e) => setCarrierPhone(e.target.value)}
                      placeholder="Carrier phone"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference (optional)
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Consignment note"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional notes"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  selected.length === 0 ||
                  !fromBranchId ||
                  !toBranchId ||
                  !handedOverByName.trim() ||
                  !carrierName.trim()
                }
                className="flex-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-3 rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  `Move ${selected.length} item(s)`
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

{/* Hidden handover sheet for PDF */}
