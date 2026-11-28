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
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    ctaLabel: 'Upload Estimate',
    ctaHref: (id) => `/branch/direct-purchase/${id}/estimate-agreement`,
  },
  {
    key: 'pendingPostEstimation',
    title: 'Post-Estimation Pending',
    description: 'Estimate agreement signed. The gold needs to be melted and final weights recorded.',
    Icon: FireIcon,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-100',
    ctaLabel: 'Continue Post-Est',
    ctaHref: (id) => `/branch/direct-purchase/${id}/post-estimation`,
  },
  {
    key: 'pendingPurchaseAgreement',
    title: 'Final Agreement Pending',
    description: 'Post-estimation saved. The final signed purchase agreement needs to be uploaded.',
    Icon: DocumentCheckIcon,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-100',
    ctaLabel: 'Upload Final Agreement',
    ctaHref: (id) => `/branch/direct-purchase/${id}/agreement`,
  },
  {
    key: 'pendingPayment',
    title: 'Payment Pending',
    description: 'All agreements signed. Payment to customer and stock transfer are not completed yet.',
    Icon: BanknotesIcon,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
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
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 p-4">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link href="/branch/reports" className="text-slate-500 hover:text-slate-900 flex items-center gap-1.5 text-sm font-medium mb-3 transition-colors">
            <ArrowLeftIcon className="w-4 h-4" /> Back to Reports
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <ExclamationTriangleIcon className="w-7 h-7 text-amber-500" /> Pending Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Action required to complete these direct purchases
          </p>
        </div>
        <Link 
          href="/branch/direct-purchase/new" 
          className="inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-2.5 rounded-lg text-sm shadow-sm transition-colors"
        >
          New Purchase
        </Link>
      </div>

      {/* Empty State */}
      {data.stats.totalPending === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            There are currently no pending direct purchases at any stage. Good job!
          </p>
        </div>
      )}

      {/* Pending Stage Sections */}
      <div className="space-y-6">
        {STAGES.map((stage) => {
          const items = data[stage.key] || [];
          if (items.length === 0) return null;

          return (
            <div key={stage.key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              
              {/* Stage Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${stage.iconBg} ${stage.iconColor}`}>
                  <stage.Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-slate-900 truncate">
                      {stage.title}
                    </h2>
                    <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 leading-snug">{stage.description}</p>
                </div>
              </div>

              {/* Data Rows */}
              <div className="divide-y divide-slate-100">
                {items.map((o) => (
                  <motion.div 
                    key={o.id} 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {o.customer?.name || 'Unknown Customer'}
                        </p>
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded">
                          #{o.id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>{o.customer?.phone}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-medium text-slate-700">
                          {o.finalPrice > 0 ? `₹${o.finalPrice.toFixed(2)}` : 'Price not set'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>{new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
                      <button 
                        onClick={() => openCancel(o)} 
                        className="bg-white border border-slate-300 text-red-600 hover:bg-red-50 hover:border-red-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" /> Cancel
                      </button>
                      <Link 
                        href={stage.ctaHref(o.id)} 
                        className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        {stage.ctaLabel} <ArrowRightIcon className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
            onClick={closeCancel}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-900 leading-tight">Cancel Order?</h3>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      #{cancelTarget.id.slice(-8).toUpperCase()} · {cancelTarget.customer?.name}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-4 bg-slate-50 border border-slate-100 p-3 rounded-lg">
                  This will move the order to <strong className="text-slate-900">Cancelled</strong>. Uploaded documents and item details will be preserved.
                </p>

                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Reason for cancellation *</label>
                <textarea 
                  value={cancelReason} 
                  onChange={(e) => setCancelReason(e.target.value)} 
                  rows={3} 
                  placeholder="e.g. Customer changed their mind..." 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none transition-all" 
                />
              </div>

              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-3">
                <button 
                  onClick={closeCancel} 
                  disabled={cancelling} 
                  className="flex-1 bg-white border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors text-sm shadow-sm"
                >
                  Keep Order
                </button>
                <button 
                  onClick={confirmCancel} 
                  disabled={cancelling || cancelReason.trim().length < 3} 
                  className="flex-1 bg-red-600 text-white font-medium py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm shadow-sm"
                >
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