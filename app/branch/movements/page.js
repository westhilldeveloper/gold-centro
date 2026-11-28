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
  const [sheetData, setSheetData] = useState(null);
  const [downloadingSheet, setDownloadingSheet] = useState(null);
  const [uploadingSheet, setUploadingSheet] = useState({});
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
      IN_TRANSIT: { c: 'bg-blue-50 text-blue-700 border-blue-200', i: TruckIcon, l: 'In Transit' },
      RECEIVED: { c: 'bg-emerald-50 text-emerald-700 border-emerald-200', i: CheckCircleIcon, l: 'Received' },
      PENDING: { c: 'bg-slate-50 text-slate-700 border-slate-200', i: TruckIcon, l: 'Pending' },
      CANCELLED: { c: 'bg-red-50 text-red-700 border-red-200', i: XMarkIcon, l: 'Cancelled' },
    };
    return cfg[status] || cfg.PENDING;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <Toaster position="top-center" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowsRightLeftIcon className="w-7 h-7 text-slate-400" /> Stock Movements
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage incoming and outgoing gold transfers</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm hover:bg-slate-800 transition-colors"
        >
          <PlusIcon className="w-4 h-4" /> New Movement
        </motion.button>
      </div>

      {movements.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <ArrowsRightLeftIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No stock movements recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
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
              <div key={m.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5">
                  
                  {/* Top Row: Status & Direction */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`text-[11px] px-2.5 py-1 rounded-md border font-semibold tracking-wide inline-flex items-center gap-1.5 ${b.c}`}>
                      <Icon className="w-3.5 h-3.5" /> {b.l.toUpperCase()}
                    </span>
                    
                    <span className={`text-[11px] font-bold tracking-wider px-2 py-1 rounded-md border ${
                      isIncoming ? 'bg-slate-50 text-slate-700 border-slate-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      {isIncoming ? '↓ INCOMING' : '↑ OUTGOING'}
                    </span>

                    {isAgentCarrier && (
                      <span className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md font-medium">
                        Carried by Agent
                      </span>
                    )}
                    {itemCount > 0 && (
                      <span className="text-[11px] bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-md font-medium">
                        {itemCount} item{itemCount > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 ml-auto font-mono">#{m.id.slice(-8).toUpperCase()}</span>
                  </div>

                  {/* Route & Core Data */}
                  <div className="mb-4">
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-900">{m.fromBranch?.name || 'External'}</span>
                      <span className="mx-2 text-slate-300">→</span>
                      <span className="font-medium text-slate-900">{m.toBranch?.name || 'External'}</span>
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-xl font-bold text-slate-900">{m.weight.toFixed(3)}<span className="text-sm text-slate-400 font-normal ml-0.5">g</span></p>
                      <p className="text-sm font-medium text-slate-500">({m.purity})</p>
                    </div>
                    {m.description && <p className="text-sm text-slate-500 mt-1">{m.description}</p>}
                    <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide">{new Date(m.createdAt).toLocaleString('en-GB')}</p>
                  </div>

                  {/* People Chain */}
                  {hasPeople && (
                    <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Handed over by</p>
                        <p className="font-medium text-slate-900 text-sm truncate">{m.handedOverByName || '—'}</p>
                        {m.handedOverByPhone && <p className="text-xs text-slate-500 truncate mt-0.5">{m.handedOverByPhone}</p>}
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Carried by</p>
                        <p className="font-medium text-slate-900 text-sm truncate">
                          {m.carrierName || '—'}
                          {m.carrierType && <span className="ml-1.5 text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{m.carrierType}</span>}
                        </p>
                        {m.carrierPhone && <p className="text-xs text-slate-500 truncate mt-0.5">{m.carrierPhone}</p>}
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Received by</p>
                        <p className="font-medium text-slate-900 text-sm truncate">{m.receivedByName || '—'}</p>
                        {m.receivedAt && <p className="text-xs text-slate-500 truncate mt-0.5">{new Date(m.receivedAt).toLocaleString('en-GB')}</p>}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    {itemCount > 0 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        className="text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                      >
                        {isExpanded ? (<><ChevronUpIcon className="w-4 h-4" /> Hide Items</>) : (<><ChevronDownIcon className="w-4 h-4" /> View Items</>)}
                      </button>
                    )}

                    {isOutgoing && m.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleDownloadNote(m, 'transfer')}
                        disabled={downloadingSheet === `${m.id}-transfer`}
                        className="text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        {downloadingSheet === `${m.id}-transfer` ? 'Preparing…' : 'Transfer Note'}
                      </button>
                    )}

                    {isIncoming && m.status === 'RECEIVED' && (
                      <button
                        onClick={() => handleDownloadNote(m, 'receiving')}
                        disabled={downloadingSheet === `${m.id}-receiving`}
                        className="text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        {downloadingSheet === `${m.id}-receiving` ? 'Preparing…' : 'Receiving Note'}
                      </button>
                    )}

                    {isIncoming && m.status === 'IN_TRANSIT' && (
                      <button
                        onClick={() => handleReceived(m.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-4 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 ml-auto"
                      >
                        <CheckCircleIcon className="w-4 h-4" /> Mark Received
                      </button>
                    )}
                  </div>

                  {/* Notes Section */}
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NoteBlock
                      label="Transfer Note"
                      subtitle="Signed by source & carrier"
                      url={m.transferNoteUrl}
                      uploadedAt={m.transferNoteUploadedAt}
                      uploadedByName={m.transferNoteUploadedByName}
                      canUpload={isOutgoing}
                      isUploading={uploadingSheet[`${m.id}-transfer`]}
                      onUpload={(file) => uploadNote(m.id, 'transfer', file)}
                    />

                    <NoteBlock
                      label="Receiving Note"
                      subtitle="Signed by receiving branch"
                      url={m.receivingNoteUrl}
                      uploadedAt={m.receivingNoteUploadedAt}
                      uploadedByName={m.receivingNoteUploadedByName}
                      canUpload={isIncoming && m.status === 'RECEIVED'}
                      isUploading={uploadingSheet[`${m.id}-receiving`]}
                      onUpload={(file) => uploadNote(m.id, 'receiving', file)}
                    />
                  </div>
                </div>

                {/* Expanded Items */}
                <AnimatePresence>
                  {isExpanded && itemCount > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-200 bg-slate-50 overflow-hidden"
                    >
                      <div className="p-5">
                        <MovementItems movementId={m.id} onPreviewImage={setPreviewImage} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

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

      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <button className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────── Note Block sub-component ─────── */
function NoteBlock({ label, subtitle, url, uploadedAt, uploadedByName, canUpload, isUploading, onUpload }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[11px] uppercase tracking-wide text-slate-700 font-bold">{label}</p>
        <p className="text-[10px] text-slate-400">{subtitle}</p>
      </div>

      {url ? (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">Document Uploaded</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {uploadedByName || 'Staff'}{uploadedAt ? ` • ${new Date(uploadedAt).toLocaleDateString('en-GB')}` : ''}
            </p>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-700 bg-white border border-slate-300 px-3 py-1.5 rounded-md font-medium hover:bg-slate-100 transition-colors">
            View
          </a>
        </div>
      ) : canUpload ? (
        <label className={`flex items-center justify-center gap-2 bg-white border-2 border-dashed border-slate-300 rounded-lg px-4 py-3 cursor-pointer transition-colors hover:border-slate-400 hover:bg-slate-50 ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}>
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-slate-600">Uploading…</span>
            </>
          ) : (
            <>
              <DocumentArrowUpIcon className="w-5 h-5 text-slate-400" />
              <span className="text-xs font-medium text-slate-600">Upload signed {label}</span>
            </>
          )}
          <input type="file" accept="image/*,application/pdf" className="hidden" disabled={isUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
        </label>
      ) : (
        <div className="text-xs text-slate-400 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg px-4 py-3">
          Not uploaded yet
        </div>
      )}
    </div>
  );
}

/* ─────── MovementItems ─────── */
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
        <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-slate-400 text-sm py-4">
        No item details available.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => {
        const firstImg =
          Array.isArray(item.imageUrls) && item.imageUrls.length > 0
            ? item.imageUrls[0]
            : null;
        return (
          <div
            key={item.id}
            className="flex gap-4 bg-white rounded-xl p-3 border border-slate-200 shadow-sm"
          >
            <button
              type="button"
              onClick={() => firstImg && onPreviewImage(firstImg)}
              disabled={!firstImg}
              className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center disabled:cursor-default"
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
            <div className="flex-1 min-w-0 py-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900 text-sm truncate">
                  {item.name}
                </p>
                <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md">
                  Qty: {item.count}
                </span>
              </div>
              {item.order && (
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  Order #{item.order.id.slice(-6)} •{' '}
                  {item.purity || item.order.purity}
                </p>
              )}
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross:</span>{' '}
                  <span className="font-medium text-slate-700">{item.grossWeight?.toFixed(2)}g</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1">
                  <span className="text-slate-500">Net:</span>{' '}
                  <span className="font-bold text-slate-900">{item.netWeight?.toFixed(2)}g</span>
                </div>
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

  const [agents, setAgents] = useState([]);
  const [handedOverByName, setHandedOverByName] = useState('');
  const [handedOverByPhone, setHandedOverByPhone] = useState('');
  const [carrierType, setCarrierType] = useState('AGENT');
  const [carrierId, setCarrierId] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [carrierPhone, setCarrierPhone] = useState('');

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
      fetch(`/api/branch/stock-items?branchId=${branchId}`).then((r) => r.json()),
      fetch('/api/users/agents').then((r) => r.json()).catch(() => ({})),
    ])
      .then(([stockRes, agentRes]) => {
        if (stockRes.success && Array.isArray(stockRes.items)) setItems(stockRes.items);
        else setItems([]);
        if (agentRes.success) setAgents(agentRes.agents || []);
      })
      .finally(() => setLoading(false));
  }, [isOpen, branchId, userName]);

  const toggleItem = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
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
    if (selected.length === 0) return toast.error('Select at least one item');
    if (!toBranchId) return toast.error('Select a destination branch');
    if (!handedOverByName.trim()) return toast.error('Enter who handed over the gold');
    if (!carrierName.trim()) return toast.error('Enter who is carrying the gold');

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
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">New Stock Movement</h2>
                <p className="text-xs text-slate-500 mt-0.5">Select items to send to another branch</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-colors">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Destination Branch <span className="text-red-500">*</span></label>
                <select
                  value={toBranchId}
                  onChange={(e) => setToBranchId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  <option value="">Select destination...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Available Items ({items.length})</p>
                  {items.length > 0 && (
                    <button onClick={toggleAll} className="text-xs text-slate-600 hover:text-slate-900 font-medium underline">
                      {selected.length === items.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                    <CubeIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm font-medium">No items available in this branch.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {items.map((item) => {
                      const isSelected = selected.includes(item.id);
                      const firstImg = Array.isArray(item.imageUrls) && item.imageUrls.length > 0 ? item.imageUrls[0] : null;
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItem(item.id)}
                            className="w-4 h-4 accent-slate-900 rounded border-slate-300"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              if (firstImg) onPreviewImage(firstImg);
                            }}
                            className="flex-shrink-0 w-12 h-12 rounded border border-slate-200 bg-slate-50 overflow-hidden"
                          >
                            {firstImg ? (
                              <img src={firstImg} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <PhotoIcon className="w-full h-full p-2.5 text-slate-300" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900 text-sm truncate">{item.name}</p>
                              <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded">Qty: {item.count}</span>
                            </div>
                            {item.order && (
                              <p className="text-[11px] text-slate-500 mt-0.5">Order #{item.order.id.slice(-6)} • {item.purity || item.order.purity}</p>
                            )}
                            <div className="flex gap-4 text-[11px] mt-1.5">
                              <span className="text-slate-500">Gross: <span className="font-medium text-slate-700">{item.grossWeight.toFixed(2)}g</span></span>
                              <span className="text-slate-500">Net: <span className="font-bold text-slate-900">{item.netWeight.toFixed(2)}g</span></span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {selected.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-3 gap-3 text-center border border-slate-200">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Items</p>
                    <p className="font-bold text-slate-900">{totalCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Gross</p>
                    <p className="font-bold text-slate-900">{totalGross.toFixed(2)}g</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Net</p>
                    <p className="font-bold text-slate-900">{totalNet.toFixed(2)}g</p>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 pt-5 space-y-4">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <UserCircleIcon className="w-4 h-4 text-slate-500" /> Handover & Carrier Details
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Handed over by <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={handedOverByName}
                      onChange={(e) => setHandedOverByName(e.target.value)}
                      placeholder="Person releasing the gold"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Handover phone</label>
                    <input
                      type="tel"
                      value={handedOverByPhone}
                      onChange={(e) => setHandedOverByPhone(e.target.value)}
                      placeholder="Optional"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-700">Carried by <span className="text-red-500">*</span></label>

                  <div className="flex flex-wrap gap-2">
                    {['AGENT', 'STAFF', 'COURIER', 'OTHER'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCarrierType(t)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                          carrierType === t
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
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
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                    >
                      <option value="">Select an agent...</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} ({a.phone})</option>
                      ))}
                    </select>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={carrierName}
                      onChange={(e) => setCarrierName(e.target.value)}
                      placeholder="Carrier name"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                    <input
                      type="tel"
                      value={carrierPhone}
                      onChange={(e) => setCarrierPhone(e.target.value)}
                      placeholder="Carrier phone"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Regular transfer to HO"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-3 flex-shrink-0 rounded-b-xl">
              <button
                onClick={onClose}
                className="flex-1 bg-white border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || selected.length === 0 || !toBranchId || !handedOverByName.trim() || !carrierName.trim()}
                className="flex-[2] bg-slate-900 text-white font-medium py-2.5 rounded-lg shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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