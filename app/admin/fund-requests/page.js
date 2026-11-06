'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingStorefrontIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

export default function AdminFundRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState('');       // 'approve' | 'reject'
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const url = filter === 'ALL'
        ? '/api/admin/fund-requests'
        : `/api/admin/fund-requests?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setRequests(data.requests);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const openReview = (request, act) => {
    setSelected(request);
    setAction(act);
    setNote('');
  };

  const closeModal = () => {
    setSelected(null);
    setAction('');
    setNote('');
  };

  const handleSubmit = async () => {
    if (!selected || !action) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/fund-requests/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          adminId: user.id,
          reviewNote: note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(action === 'approve' ? '✅ Fund approved & credited!' : '❌ Request rejected');
      closeModal();
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

  const pendingAmount = requests
    .filter((r) => r.status === 'PENDING')
    .reduce((s, r) => s + r.amount, 0);

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
            Approve or reject funding requests from branches
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All</option>
        </select>
      </div>

      {/* Summary */}
      {filter === 'PENDING' && requests.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-5 text-black">
          <p className="text-sm font-medium opacity-80">Total Pending</p>
          <p className="text-3xl font-bold mt-1">
            ₹{pendingAmount.toFixed(2)}
            <span className="text-sm font-medium opacity-80 ml-2">
              ({requests.length} request{requests.length > 1 ? 's' : ''})
            </span>
          </p>
        </div>
      )}

      {/* List */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center text-gray-500">
          <BanknotesIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p>No {filter.toLowerCase()} requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const cfg = statusConfig[r.status];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-md p-5 border border-gray-100"
              >
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1 font-medium ${cfg.color}`}>
                        <Icon className="w-3 h-3" /> {cfg.label}
                      </span>
                      <span className="font-mono text-xs text-gray-400">#{r.id.slice(-8)}</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">₹{r.amount.toFixed(2)}</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">{r.purpose}</p>
                    {r.description && (
                      <p className="text-xs text-gray-500 mt-1">{r.description}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                      <BuildingStorefrontIcon className="w-3.5 h-3.5" />
                      <span className="font-medium">{r.branch?.name}</span>
                      <span className="text-gray-400 font-mono">({r.branch?.code})</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Requested {new Date(r.createdAt).toLocaleString()}
                    </p>
                    {r.reviewNote && (
                      <p className="text-xs text-gray-500 mt-1">
                        💬 Admin note: {r.reviewNote}
                      </p>
                    )}
                  </div>

                  {r.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openReview(r, 'approve')}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-1"
                      >
                        <CheckCircleIcon className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => openReview(r, 'reject')}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-1"
                      >
                        <XCircleIcon className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {selected && action && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl font-bold ${action === 'approve' ? 'text-green-600' : 'text-red-600'}`}>
                  {action === 'approve' ? '✅ Approve Fund' : '❌ Reject Fund'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-500">Branch</p>
                <p className="font-medium">{selected.branch?.name}</p>
                <p className="text-sm text-gray-500 mt-3">Amount</p>
                <p className="text-2xl font-bold text-gray-900">₹{selected.amount.toFixed(2)}</p>
                <p className="text-sm text-gray-500 mt-3">Purpose</p>
                <p className="font-medium text-sm">{selected.purpose}</p>
              </div>

              {action === 'approve' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-xs text-green-800">
                  ✅ This will <strong>credit ₹{selected.amount.toFixed(2)}</strong> to {selected.branch?.name}'s cash balance immediately.
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={action === 'approve' ? 'e.g. Approved by HO' : 'Reason for rejection'}
                  rows={3}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={closeModal} className="flex-1 bg-gray-100 py-3 rounded-xl font-medium hover:bg-gray-200">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`flex-1 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50 ${
                    action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {submitting
                    ? 'Processing...'
                    : action === 'approve'
                    ? 'Confirm Approve'
                    : 'Confirm Reject'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}