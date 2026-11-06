'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../../lib/socket';

const STATUS = {
  PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: ClockIcon, label: 'Pending' },
  APPROVED: { color: 'bg-green-100 text-green-700', icon: CheckCircleIcon, label: 'Approved' },
  REJECTED: { color: 'bg-red-100 text-red-700', icon: XCircleIcon, label: 'Rejected' },
};

const PURPOSES = [
  'Gold purchase',
  'Customer advance',
  'Travel / fuel',
  'Petty expense',
  'Emergency',
  'Other',
];

export default function AgentCashPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('ledger'); // 'ledger' | 'requests'
  const [txns, setTxns] = useState([]);
  const [requests, setRequests] = useState([]);
  const [balance, setBalance] = useState(0);
  const [credits, setCredits] = useState(0);
  const [debits, setDebits] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ amount: '', purpose: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  // ---- Load ----
  const loadAll = async () => {
    if (!user?.id) return;
    try {
      const [cashRes, reqRes] = await Promise.all([
        fetch(`/api/agent/cash?agentId=${user.id}`),
        fetch(`/api/agent/cash-request?agentId=${user.id}`),
      ]);
      const cashData = await cashRes.json();
      const reqData = await reqRes.json();

      if (cashData.success) {
        setTxns(cashData.transactions);
        setBalance(cashData.balance);
        setCredits(cashData.credits);
        setDebits(cashData.debits);
      }
      if (reqData.success) setRequests(reqData.requests);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [user]);

  // ---- Socket listeners ----
  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket();
    socket.emit('join-room', `agent_${user.id}`);
    socket.on('agent-cash-request-updated', (updated) => {
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      toast.info(`Cash request ${updated.status.toLowerCase()}!`);
    });
    socket.on('agent-cash-updated', (txn) => {
      // Refresh ledger
      loadAll();
      toast.success(`₹${txn.amount.toFixed(2)} credited to your account`);
    });
    return () => {
      socket.off('agent-cash-request-updated');
      socket.off('agent-cash-updated');
    };
  }, [user]);

  // ---- Submit request ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.purpose) {
      toast.error('Amount and purpose are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/agent/cash-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: user.id,
          amount: parseFloat(form.amount),
          purpose: form.purpose,
          description: form.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('✅ Request submitted to branch!');
      setModalOpen(false);
      setForm({ amount: '', purpose: '', description: '' });
      setTab('requests');
      loadAll();
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const pendingAmount = pendingRequests.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BanknotesIcon className="w-8 h-8 text-yellow-600" /> Cash
          </h1>
          <p className="text-gray-500 mt-1">
            Request cash from branch, track your ledger
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-lg"
        >
          <PlusIcon className="w-5 h-5" /> Request Cash
        </motion.button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl shadow-md p-5 text-black"
        >
          <p className="text-sm font-medium opacity-80">Available Balance</p>
          <p className="text-4xl font-bold mt-1">₹{balance.toFixed(2)}</p>
          {pendingAmount > 0 && (
            <p className="text-xs mt-2 opacity-80">
              + ₹{pendingAmount.toFixed(0)} pending approval
            </p>
          )}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl shadow-md p-5"
        >
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <ArrowDownIcon className="w-4 h-4 text-green-500" /> Total Credits
          </p>
          <p className="text-3xl font-bold text-green-600 mt-2">₹{credits.toFixed(2)}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-md p-5"
        >
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <ArrowUpIcon className="w-4 h-4 text-red-500" /> Total Debits
          </p>
          <p className="text-3xl font-bold text-red-600 mt-2">₹{debits.toFixed(2)}</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 pb-2">
        <button
          onClick={() => setTab('ledger')}
          className={`px-4 py-2 font-semibold transition ${
            tab === 'ledger'
              ? 'text-yellow-600 border-b-2 border-yellow-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Ledger ({txns.length})
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`px-4 py-2 font-semibold transition relative ${
            tab === 'requests'
              ? 'text-yellow-600 border-b-2 border-yellow-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          My Requests ({requests.length})
          {pendingRequests.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] rounded-full">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* ---- LEDGER TAB ---- */}
      {tab === 'ledger' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-md overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-lg">Transaction History</h2>
          </div>
          {txns.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No transactions yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {txns.map((t) => (
                <div key={t.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        t.type === 'CREDIT'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {t.type === 'CREDIT' ? (
                        <ArrowDownIcon className="w-5 h-5" />
                      ) : (
                        <ArrowUpIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{t.purpose}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(t.createdAt).toLocaleString()}
                        {t.description && ` • ${t.description}`}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`font-bold ${
                      t.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {t.type === 'CREDIT' ? '+' : '−'} ₹{t.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ---- REQUESTS TAB ---- */}
      {tab === 'requests' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-md overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-lg">My Cash Requests</h2>
            {pendingAmount > 0 && (
              <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full font-medium">
                ₹{pendingAmount.toFixed(0)} pending
              </span>
            )}
          </div>

          {requests.length === 0 ? (
            <div className="p-8 text-center">
              <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No cash requests yet.</p>
              <button
                onClick={() => setModalOpen(true)}
                className="mt-3 text-yellow-600 font-medium hover:underline"
              >
                Raise your first request →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map((r) => {
                const cfg = STATUS[r.status];
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-6 py-4 hover:bg-gray-50"
                  >
                    <div className="flex flex-wrap justify-between items-start gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1 font-medium ${cfg.color}`}
                          >
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </span>
                          <span className="font-mono text-xs text-gray-400">
                            #{r.id.slice(-8)}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          ₹{r.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-700 mt-0.5">{r.purpose}</p>
                        {r.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Requested {new Date(r.createdAt).toLocaleString()}
                        </p>
                        {r.reviewNote && (
                          <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                            💬 Branch note: {r.reviewNote}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-400">
                        <p>{r.branch?.name}</p>
                        <p className="font-mono">{r.branch?.code}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ---- New Request Modal ---- */}
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
                <h2 className="text-xl font-bold">Request Cash from Branch</h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
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
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
                  >
                    <option value="">Select purpose</option>
                    {PURPOSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
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
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none resize-none"
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