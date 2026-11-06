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
    PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: ClockIcon, label: 'Pending' },
    APPROVED: { color: 'bg-green-100 text-green-700', icon: CheckCircleIcon, label: 'Approved' },
    REJECTED: { color: 'bg-red-100 text-red-700', icon: XCircleIcon, label: 'Rejected' },
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const pending = requests.filter((r) => r.status === 'PENDING');
  const totalPending = pending.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BanknotesIcon className="w-8 h-8 text-yellow-600" /> Fund Requests
          </h1>
          <p className="text-gray-500 mt-1">
            Raise requests to Head Office for branch funding
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-lg"
        >
          <PlusIcon className="w-5 h-5" /> New Request
        </motion.button>
      </div>

      {/* Summary */}
      {pending.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-5 text-black">
          <p className="text-sm font-medium opacity-80">Pending Requests</p>
          <p className="text-3xl font-bold mt-1">
            ₹{totalPending.toFixed(2)}
            <span className="text-sm font-medium opacity-80 ml-2">({pending.length})</span>
          </p>
        </div>
      )}

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center text-gray-500">
          <BanknotesIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p>No fund requests yet.</p>
          <p className="text-sm mt-2">Click "New Request" to raise one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md divide-y divide-gray-100">
          {requests.map((r) => {
            const cfg = statusConfig[r.status];
            const Icon = cfg.icon;
            return (
              <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1 font-medium ${cfg.color}`}>
                        <Icon className="w-3 h-3" /> {cfg.label}
                      </span>
                      <span className="font-mono text-xs text-gray-400">#{r.id.slice(-8)}</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">₹{r.amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-700 mt-1">{r.purpose}</p>
                    {r.description && (
                      <p className="text-xs text-gray-500 mt-1">{r.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Requested {new Date(r.createdAt).toLocaleString()}
                    </p>
                    {r.reviewNote && (
                      <p className="text-xs text-gray-500 mt-1">
                        💬 Admin note: {r.reviewNote}
                      </p>
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">New Fund Request</h2>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="e.g. 50000"
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purpose <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Add more context..."
                    rows={3}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-3 rounded-xl shadow-md disabled:opacity-50"
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