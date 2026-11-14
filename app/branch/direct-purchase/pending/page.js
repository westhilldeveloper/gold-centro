// app/branch/direct-purchase/pending/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import {
  ArrowLeftIcon,
  BanknotesIcon,
  DocumentTextIcon,
  FireIcon,
  DocumentCheckIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const STAGES = [
  {
    key: 'pendingEstimateAgreement',
    title: 'Estimate Agreement Pending',
    description: 'Customer details and pre-estimation recorded. The signed estimate agreement has not been uploaded yet.',
    Icon: DocumentTextIcon,
    colors: { bg: 'bg-amber-50', border: 'border-amber-300', icon: 'text-amber-600', title: 'text-amber-900', body: 'text-amber-800', btn: 'bg-amber-500 hover:bg-amber-600' },
    ctaLabel: 'Upload Estimate',
    ctaHref: (id) => `/branch/direct-purchase/${id}/estimate-agreement`,
  },
  {
    key: 'pendingPostEstimation',
    title: 'Post-Estimation Pending',
    description: 'Estimate agreement signed. The gold needs to be melted and final weights recorded.',
    Icon: FireIcon,
    colors: { bg: 'bg-orange-50', border: 'border-orange-300', icon: 'text-orange-600', title: 'text-orange-900', body: 'text-orange-800', btn: 'bg-orange-500 hover:bg-orange-600' },
    ctaLabel: 'Continue Post-Est',
    ctaHref: (id) => `/branch/direct-purchase/${id}/post-estimation`,
  },
  {
    key: 'pendingPurchaseAgreement',
    title: 'Final Agreement Pending',
    description: 'Post-estimation saved. The final signed purchase agreement needs to be uploaded.',
    Icon: DocumentCheckIcon,
    colors: { bg: 'bg-purple-50', border: 'border-purple-300', icon: 'text-purple-600', title: 'text-purple-900', body: 'text-purple-800', btn: 'bg-purple-500 hover:bg-purple-600' },
    ctaLabel: 'Upload Final Agreement',
    ctaHref: (id) => `/branch/direct-purchase/${id}/agreement`,
  },
  {
    key: 'pendingPayment',
    title: 'Payment Pending',
    description: 'All agreements signed. Payment to customer and stock transfer are not completed yet.',
    Icon: BanknotesIcon,
    colors: { bg: 'bg-blue-50', border: 'border-blue-300', icon: 'text-blue-600', title: 'text-blue-900', body: 'text-blue-800', btn: 'bg-blue-600 hover:bg-blue-700' },
    ctaLabel: 'Resume Payment',
    ctaHref: (id) => `/branch/direct-purchase/${id}/pay`,
  },
];

export default function PendingOrdersPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const loadData = () => {
    if (!user?.branchId) return;
    setLoading(true);
    fetch(`/api/branch/reports/direct-purchases?branchId=${user.branchId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [user]);

  const openCancel = (order) => { setCancelTarget(order); setCancelReason(''); };
  const closeCancel = () => { setCancelTarget(null); setCancelReason(''); };

  const confirmCancel = async () => {
    if (!cancelReason.trim() || cancelReason.trim().length < 3) {
      return toast.error('Please enter a reason (min 3 chars)');
    }
    setCancelling(true);
    const t = toast.loading('Cancelling order...');
    try {
      const res = await fetch(`/api/branch/direct-purchase/${cancelTarget.id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim(), staffId: user.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success('Order cancelled', { id: t });
      closeCancel();
      loadData();
    } catch (err) {
      toast.error(err.message, { id: t });
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/branch/reports" className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm mb-2">
            <ArrowLeftIcon className="w-4 h-4" /> Back to Reports
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-7 h-7 md:w-8 md:h-8 text-amber-600" /> Pending Orders
          </h1>
          <p className="text-gray-500 mt-1">Action required to complete these direct purchases</p>
        </div>
        <Link href="/branch/direct-purchase/new" className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-5 py-2.5 rounded-xl shadow-md text-sm">
          New Purchase
        </Link>
      </div>

      {/* Pending Stage Alerts */}
      {STAGES.map((stage) => {
        const items = data[stage.key] || [];
        if (items.length === 0) return null;

        return (
          <div key={stage.key} className={`${stage.colors.bg} border-2 ${stage.colors.border} rounded-2xl p-4 md:p-5 shadow-sm`}>
            <div className="flex items-start gap-3 mb-4">
              <stage.Icon className={`w-6 h-6 ${stage.colors.icon} flex-shrink-0`} />
              <div className="flex-1">
                <h2 className={`text-base md:text-lg font-bold ${stage.colors.title}`}>
                  {items.length} · {stage.title}
                </h2>
                <p className={`text-xs md:text-sm ${stage.colors.body} mt-1`}>{stage.description}</p>
              </div>
            </div>

            <div className="space-y-2">
              {items.map((o) => (
                <div key={o.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {o.customer?.name || 'Unknown'}
                      <span className="font-mono text-[10px] text-gray-400 ml-2">#{o.id.slice(-6).toUpperCase()}</span>
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {o.customer?.phone} • {o.finalPrice > 0 ? `₹${o.finalPrice.toFixed(2)}` : 'Price not set'} • {new Date(o.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openCancel(o)} className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs px-3 py-2 rounded-lg flex items-center gap-1 border border-red-200">
                      <XMarkIcon className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <Link href={stage.ctaHref(o.id)} className={`${stage.colors.btn} text-white font-semibold text-xs px-3 py-2 rounded-lg flex items-center gap-1 transition`}>
                      {stage.ctaLabel} <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {data.stats.totalPending === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center text-green-800 flex flex-col items-center gap-2">
          <CheckCircleIcon className="w-12 h-12 text-green-500" />
          <p className="font-semibold text-lg">All caught up!</p>
          <p className="text-sm">There are no pending direct purchases.</p>
        </div>
      )}

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeCancel}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 md:p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">Cancel this order?</h3>
                  <p className="text-xs text-gray-500 mt-1">#{cancelTarget.id.slice(-8).toUpperCase()} · {cancelTarget.customer?.name}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3">
                This will move the order to <strong>Cancelled</strong>. All uploaded documents and item details will be preserved.
              </p>

              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Reason for cancellation *</label>
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} placeholder="e.g. Customer changed their mind, gold purity mismatch..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 outline-none resize-none" />

              <div className="flex gap-2 mt-4">
                <button onClick={closeCancel} disabled={cancelling} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2.5 rounded-xl disabled:opacity-50">Keep order</button>
                <button onClick={confirmCancel} disabled={cancelling || cancelReason.trim().length < 3} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50">
                  {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}