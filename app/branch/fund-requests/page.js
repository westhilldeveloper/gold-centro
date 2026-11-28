// app/branch/fund-requests/page.js
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  BanknotesIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

export default function BranchFundRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ amount: '', purpose: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user?.branchId) return;
    try {
      const res = await fetch(`/api/branch/fund-requests?branchId=${user.branchId}`);
      const data = await res.json();
      if (data.success) setRequests(data.requests);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.purpose) {
      toast.error('Amount and purpose are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/branch/fund-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: user.branchId,
          amount: parseFloat(form.amount),
          purpose: form.purpose,
          description: form.description,
          requestedBy: user.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('✅ Fund request submitted!');
      setModalOpen(false);
      setForm({ amount: '', purpose: '', description: '' });
      load();
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig = {
    PENDING: { 
      style: 'bg-amber-50 text-amber-700 border-amber-200', 
      icon: ClockIcon, 
      label: 'Pending' 
    },
    APPROVED: { 
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
      icon: CheckCircleIcon, 
      label: 'Approved' 
    },
    REJECTED: { 
      style: 'bg-red-50 text-red-700 border-red-200', 
      icon: XCircleIcon, 
      label: 'Rejected' 
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === 'PENDING');
  const totalPending = pending.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <BanknotesIcon className="w-7 h-7 text-slate-400" /> Fund Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Raise requests to Head Office for branch funding
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm hover:bg-slate-800 transition-colors"
        >
          <PlusIcon className="w-4 h-4" /> New Request
        </motion.button>
      </div>

      {/* Summary Card */}
      {pending.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-amber-500 shadow-sm p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Pending Requests
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-bold text-slate-900">
              ₹{totalPending.toFixed(2)}
            </p>
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {pending.length} request{pending.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <BanknotesIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No fund requests yet.</p>
          <p className="text-sm text-slate-400 mt-1">Click "New Request" to raise one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {requests.map((r) => {
            const cfg = statusConfig[r.status];
            const Icon = cfg.icon;
            return (
              <motion.div 
                key={r.id} 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="px-6 py-5 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div className="flex-1 min-w-[240px]">
                    
                    {/* Status & ID */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-[11px] px-2.5 py-1 rounded-md border font-semibold tracking-wide inline-flex items-center gap-1.5 ${cfg.style}`}>
                        <Icon className="w-3.5 h-3.5" /> {cfg.label.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs text-slate-400">#{r.id.slice(-8).toUpperCase()}</span>
                    </div>

                    {/* Amount & Purpose */}
                    <p className="text-xl font-bold text-slate-900">₹{r.amount.toFixed(2)}</p>
                    <p className="text-sm font-medium text-slate-700 mt-1">{r.purpose}</p>
                    
                    {/* Description */}
                    {r.description && (
                      <p className="text-sm text-slate-500 mt-1">{r.description}</p>
                    )}
                    
                    {/* Dates & Notes */}
                    <p className="text-[11px] uppercase tracking-wide text-slate-400 mt-2">
                      Requested {new Date(r.createdAt).toLocaleString('en-GB')}
                    </p>
                    
                    {r.reviewNote && (
                      <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 inline-block">
                        <p className="text-xs text-slate-700">
                          <span className="font-semibold text-slate-900">Admin Note:</span> {r.reviewNote}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* New Request Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">New Fund Request</h2>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-2 rounded-lg border border-slate-200 transition-colors">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wide">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="e.g. 50000"
                    required
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wide">
                    Purpose <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    required
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all bg-white"
                  >
                    <option value="">Select purpose</option>
                    <option value="Gold purchase">Gold purchase</option>
                    <option value="Petty cash replenishment">Petty cash replenishment</option>
                    <option value="Salary / wages">Salary / wages</option>
                    <option value="Branch expenses">Branch expenses</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wide">
                    Description (optional)
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Add more context..."
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 bg-white border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] bg-slate-900 text-white font-medium py-2.5 rounded-lg shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-colors text-sm flex items-center justify-center"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}