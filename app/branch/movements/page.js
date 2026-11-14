// app/branch/movements/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import MovementTransferNote from '../../components/MovementTransferNote';
import { downloadTransferNote } from '../../../lib/downloadTransferNote';
import {
  ArrowsRightLeftIcon,
  TruckIcon,
  CheckCircleIcon,
  PlusIcon,
  XMarkIcon,
  PhotoIcon,
  CubeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserCircleIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

export default function BranchMovements() {
  const { user } = useAuth();
  const [movements, setMovements] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [sheetData, setSheetData] = useState(null); // { movement, items, noteType }
  const [downloadingSheet, setDownloadingSheet] = useState(null);
  const [uploadingSheet, setUploadingSheet] = useState({}); // { [`${id}-${type}`]: bool }
  const sheetRef = useRef(null);

  const load = async () => {
    if (!user?.branchId) return;
    try {
      const [movRes, brRes] = await Promise.all([
        fetch(`/api/branch/movements?branchId=${user.branchId}`),
        fetch('/api/admin/branches'),
      ]);
      const movData = await movRes.json();
      const brData = await brRes.json();
      if (movData.success) setMovements(movData.movements);
      if (brData.success) setBranches(brData.branches.filter((b) => b.id !== user.branchId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  // Download trigger
  useEffect(() => {
    if (!sheetData) return;
    const run = async () => {
      await new Promise((r) => requestAnimationFrame(r));
      if (!sheetRef.current) return;
      try {
        await downloadTransferNote(sheetRef.current, sheetData.movement, sheetData.noteType);
        toast.success(`📄 ${sheetData.noteType === 'transfer' ? 'Transfer' : 'Receiving'} note downloaded`);
      } catch (err) {
        toast.error('Download failed: ' + err.message);
      } finally {
        setSheetData(null);
        setDownloadingSheet(null);
      }
    };
    run();
  }, [sheetData]);

  const handleDownloadNote = async (movement, noteType) => {
    setDownloadingSheet(`${movement.id}-${noteType}`);
    try {
      const res = await fetch(`/api/branch/movements/${movement.id}/items`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSheetData({ movement, items: data.items || [], noteType });
    } catch (err) {
      toast.error('Failed to prepare note: ' + err.message);
      setDownloadingSheet(null);
    }
  };

  const uploadNote = async (movementId, noteType, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error('File too large. Max 10 MB.');

    const key = `${movementId}-${noteType}`;
    setUploadingSheet((p) => ({ ...p, [key]: true }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: 'POST', body: formData }
      );
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) throw new Error(cloudData.error?.message || 'Cloudinary failed');

      const endpoint = noteType === 'transfer' ? 'transfer-note' : 'receiving-note';
      const res = await fetch(`/api/branch/movements/${movementId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cloudData.secure_url,
          uploadedBy: user.id,
          uploadedByName: user.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`✅ ${noteType === 'transfer' ? 'Transfer' : 'Receiving'} note uploaded`);
      load();
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setUploadingSheet((p) => ({ ...p, [key]: false }));
    }
  };

  const handleReceived = async (movementId) => {
    const receiverName = prompt('Name of person receiving the gold?', user?.name || '');
    if (!receiverName || !receiverName.trim()) return;
    try {
      const res = await fetch(`/api/branch/movements/${movementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RECEIVED',
          receivedBy: user.id,
          receivedByName: receiverName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('✅ Marked received');
      load();
    } catch (err) {
      toast.error('❌ ' + err.message);
    }
  };

  const badge = (status) => {
    const cfg = {
      IN_TRANSIT: { c: 'bg-yellow-100 text-yellow-700', i: TruckIcon, l: 'In Transit' },
      RECEIVED: { c: 'bg-green-100 text-green-700', i: CheckCircleIcon, l: 'Received' },
      PENDING: { c: 'bg-blue-100 text-blue-700', i: TruckIcon, l: 'Pending' },
      CANCELLED: { c: 'bg-red-100 text-red-700', i: XMarkIcon, l: 'Cancelled' },
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
    <div className="space-y-6">
      <Toaster position="top-center" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowsRightLeftIcon className="w-8 h-8 text-yellow-600" /> Stock Movements
          </h1>
          <p className="text-gray-500 mt-1">Incoming and outgoing transfers</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-lg"
        >
          <PlusIcon className="w-5 h-5" /> New Movement
        </motion.button>
      </div>

      {movements.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center text-gray-500">
          <ArrowsRightLeftIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p>No movements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {movements.map((m) => {
            const b = badge(m.status);
            const Icon = b.i;
            const isIncoming = m.toBranchId === user.branchId;
            const isOutgoing = m.fromBranchId === user.branchId;
            const itemCount = m.itemIds?.length || 0;
            const isExpanded = expandedId === m.id;
            const hasPeople = m.handedOverByName || m.carrierName || m.receivedByName;
            const isAgentCarrier = m.carrierType === 'AGENT' && m.carrierId;

            return (
              <div key={m.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="px-6 py-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${b.c}`}>
                      <Icon className="w-3 h-3" /> {b.l}
                    </span>
                    <span className={`text-xs font-bold ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                      {isIncoming ? '↓ INCOMING' : '↑ OUTGOING'}
                    </span>
                    {isAgentCarrier && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                        🤖 Carried by Agent
                      </span>
                    )}
                    {itemCount > 0 && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {itemCount} item{itemCount > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto font-mono">#{m.id.slice(-8)}</span>
                  </div>

                  {/* Route + weight + date */}
                  <p className="text-sm mt-2">
                    <span className="text-gray-500">From:</span>{' '}
                    <span className="font-medium">{m.fromBranch?.name || 'External'}</span>
                    {' → '}
                    <span className="text-gray-500">To:</span>{' '}
                    <span className="font-medium">{m.toBranch?.name || 'External'}</span>
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {m.weight.toFixed(2)}g ({m.purity})
                  </p>
                  {m.description && <p className="text-xs text-gray-500 mt-1">{m.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(m.createdAt).toLocaleString()}</p>

                  {/* People chain */}
                  {hasPeople && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Handed over by</p>
                        <p className="font-medium text-gray-900 mt-0.5 truncate">{m.handedOverByName || '—'}</p>
                        {m.handedOverByPhone && <p className="text-gray-500 truncate">{m.handedOverByPhone}</p>}
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-2.5 border border-yellow-100">
                        <p className="text-[10px] uppercase tracking-wider text-yellow-700 font-semibold">Carried by</p>
                        <p className="font-medium text-gray-900 mt-0.5 truncate">
                          {m.carrierName || '—'}
                          {m.carrierType && <span className="ml-1 text-[10px] text-yellow-700 font-normal">({m.carrierType})</span>}
                        </p>
                        {m.carrierPhone && <p className="text-gray-500 truncate">{m.carrierPhone}</p>}
                      </div>
                      <div className="bg-green-50 rounded-lg p-2.5 border border-green-100">
                        <p className="text-[10px] uppercase tracking-wider text-green-700 font-semibold">Received by</p>
                        <p className="font-medium text-gray-900 mt-0.5 truncate">{m.receivedByName || '—'}</p>
                        {m.receivedAt && <p className="text-gray-500 truncate">{new Date(m.receivedAt).toLocaleString()}</p>}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {itemCount > 0 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50"
                      >
                        {isExpanded ? (<><ChevronUpIcon className="w-4 h-4" /> Hide Items</>) : (<><ChevronDownIcon className="w-4 h-4" /> View Items</>)}
                      </button>
                    )}

                    {isOutgoing && m.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleDownloadNote(m, 'transfer')}
                        disabled={downloadingSheet === `${m.id}-transfer`}
                        className="text-sm text-gray-700 hover:text-black flex items-center gap-1 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        {downloadingSheet === `${m.id}-transfer` ? 'Preparing…' : 'Transfer Note'}
                      </button>
                    )}

                    {isIncoming && m.status === 'RECEIVED' && (
                      <button
                        onClick={() => handleDownloadNote(m, 'receiving')}
                        disabled={downloadingSheet === `${m.id}-receiving`}
                        className="text-sm text-gray-700 hover:text-black flex items-center gap-1 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        {downloadingSheet === `${m.id}-receiving` ? 'Preparing…' : 'Receiving Note'}
                      </button>
                    )}

                    {isIncoming && m.status === 'IN_TRANSIT' && (
                      <button
                        onClick={() => handleReceived(m.id)}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1"
                      >
                        <CheckCircleIcon className="w-4 h-4" /> Mark Received
                      </button>
                    )}
                  </div>

                  {/* ─────── TWO NOTE SECTIONS ─────── */}
                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Transfer Note block */}
                    <NoteBlock
                      label="Transfer Note"
                      subtitle="Signed by source & carrier"
                      url={m.transferNoteUrl}
                      uploadedAt={m.transferNoteUploadedAt}
                      uploadedByName={m.transferNoteUploadedByName}
                      canUpload={isOutgoing}
                      isUploading={uploadingSheet[`${m.id}-transfer`]}
                      onUpload={(file) => uploadNote(m.id, 'transfer', file)}
                      accentColor="amber"
                    />

                    {/* Receiving Note block */}
                    <NoteBlock
                      label="Receiving Note"
                      subtitle="Signed by receiving branch"
                      url={m.receivingNoteUrl}
                      uploadedAt={m.receivingNoteUploadedAt}
                      uploadedByName={m.receivingNoteUploadedByName}
                      canUpload={isIncoming && m.status === 'RECEIVED'}
                      isUploading={uploadingSheet[`${m.id}-receiving`]}
                      onUpload={(file) => uploadNote(m.id, 'receiving', file)}
                      accentColor="green"
                    />
                  </div>
                </div>

                {/* Expanded items */}
                <AnimatePresence>
                  {isExpanded && itemCount > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-100 bg-gray-50 overflow-hidden"
                    >
                      <div className="p-4">
                        <MovementItems movementId={m.id} onPreviewImage={setPreviewImage} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Hidden PDF renderer */}
          {sheetData && (
            <div style={{ position: 'fixed', left: '-10000px', top: 0, pointerEvents: 'none' }}>
              <MovementTransferNote
                ref={sheetRef}
                movement={sheetData.movement}
                items={sheetData.items}
                noteType={sheetData.noteType}
              />
            </div>
          )}
        </div>
      )}

      <NewMovementModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => { setModalOpen(false); load(); }}
        branchId={user?.branchId}
        branches={branches}
        userId={user?.id}
        userName={user?.name}
        onPreviewImage={setPreviewImage}
      />

      {/* Image preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <button className="absolute top-4 right-4 text-white hover:text-yellow-400 p-2 rounded-full bg-white/10">
              <XMarkIcon className="w-8 h-8" />
            </button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────── Note Block sub-component ─────── */
function NoteBlock({ label, subtitle, url, uploadedAt, uploadedByName, canUpload, isUploading, onUpload, accentColor }) {
  const accent = {
    amber: {
      bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800',
      dashed: 'border-amber-300', btn: 'bg-amber-50 hover:bg-amber-100', btnText: 'text-amber-700',
    },
    green: {
      bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800',
      dashed: 'border-green-300', btn: 'bg-green-50 hover:bg-green-100', btnText: 'text-green-700',
    },
  }[accentColor] || {
    bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700',
    dashed: 'border-gray-300', btn: 'bg-gray-50 hover:bg-gray-100', btnText: 'text-gray-700',
  };

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">{label}</p>
      <p className="text-[10px] text-gray-400 mb-2">{subtitle}</p>

      {url ? (
        <div className={`flex items-center gap-2 ${accent.bg} ${accent.border} border rounded-lg p-2`}>
          <CheckCircleIcon className={`w-4 h-4 ${accent.text} flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <p className={`text-[11px] font-medium ${accent.text} truncate`}>Uploaded</p>
            <p className="text-[10px] text-gray-500 truncate">
              {uploadedByName || ''}{uploadedAt ? ` • ${new Date(uploadedAt).toLocaleDateString()}` : ''}
            </p>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className={`text-[11px] ${accent.text} underline font-medium flex-shrink-0`}>
            View
          </a>
        </div>
      ) : canUpload ? (
        <label className={`flex items-center justify-center gap-1.5 ${accent.btn} border-2 border-dashed ${accent.dashed} rounded-lg px-3 py-2 cursor-pointer transition ${isUploading ? 'opacity-60' : ''}`}>
          {isUploading ? (
            <>
              <div className={`w-3.5 h-3.5 border-2 ${accent.btnText} border-t-transparent rounded-full animate-spin`} />
              <span className={`text-[11px] font-medium ${accent.btnText}`}>Uploading…</span>
            </>
          ) : (
            <>
              <DocumentArrowUpIcon className={`w-4 h-4 ${accent.btnText}`} />
              <span className={`text-[11px] font-medium ${accent.btnText}`}>Upload signed {label}</span>
            </>
          )}
          <input type="file" accept="image/*,application/pdf" className="hidden" disabled={isUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
        </label>
      ) : (
        <div className="text-[11px] text-gray-400 italic bg-gray-50 border border-dashed border-gray-200 rounded-lg px-3 py-2">
          Not uploaded yet
        </div>
      )}
    </div>
  );
}

/* ─────── MovementItems, NewMovementModal  ─────── */
function MovementItems({ movementId, onPreviewImage }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/branch/movements/${movementId}/items`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.items)) setItems(d.items);
        else setItems([]);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [movementId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-gray-400 text-sm py-4">
        No item details available.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((item) => {
        const firstImg =
          Array.isArray(item.imageUrls) && item.imageUrls.length > 0
            ? item.imageUrls[0]
            : null;
        return (
          <div
            key={item.id}
            className="flex gap-3 bg-white rounded-xl p-3 border border-gray-100"
          >
            <button
              type="button"
              onClick={() => firstImg && onPreviewImage(firstImg)}
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
            </div>
          </div>
        );
      })}
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
  branchId,
  branches,
  userId,
  userName,
  onPreviewImage,
}) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [toBranchId, setToBranchId] = useState('');
  const [description, setDescription] = useState('');
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

  // Load items + agents when modal opens
  useEffect(() => {
    if (!isOpen || !branchId) return;
    setLoading(true);
    setSelected([]);
    setToBranchId('');
    setDescription('');
    setHandedOverByName(userName || '');
    setHandedOverByPhone('');
    setCarrierType('AGENT');
    setCarrierId('');
    setCarrierName('');
    setCarrierPhone('');

    Promise.all([
      fetch(`/api/branch/stock-items?branchId=${branchId}`).then((r) =>
        r.json()
      ),
      fetch('/api/users/agents')
        .then((r) => r.json())
        .catch(() => ({})),
    ])
      .then(([stockRes, agentRes]) => {
        if (stockRes.success && Array.isArray(stockRes.items))
          setItems(stockRes.items);
        else setItems([]);
        if (agentRes.success) setAgents(agentRes.agents || []);
      })
      .finally(() => setLoading(false));
  }, [isOpen, branchId, userName]);

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
    if (selected.length === 0) {
      toast.error('Select at least one item');
      return;
    }
    if (!toBranchId) {
      toast.error('Select a destination branch');
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
      const res = await fetch('/api/branch/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromBranchId: branchId,
          toBranchId,
          itemIds: selected,
          description: description || null,
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
                  Select items to send to another branch
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination Branch <span className="text-red-500">*</span>
                </label>
                <select
                  value={toBranchId}
                  onChange={(e) => setToBranchId(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
                >
                  <option value="">Select destination</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

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
                      No items in this branch.
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
                            <div className="flex items-center gap-2">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Regular transfer to HO"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
                />
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
                  !toBranchId ||
                  !handedOverByName.trim() ||
                  !carrierName.trim()
                }
                className="flex-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-3 rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  `Send ${selected.length} item(s)`
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
  
}
