'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  InformationCircleIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../../lib/socket';

export default function BranchCash() {
  const { user } = useAuth();
  
  // Ledger state
  const [txns, setTxns] = useState([]);
  const [balance, setBalance] = useState(0);
  const [credits, setCredits] = useState(0);
  const [debits, setDebits] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    purpose: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Transfer state
  const [branches, setBranches] = useState([]);
  const [targetBranchId, setTargetBranchId] = useState('');

  const load = async () => {
    if (!user?.branchId) return;
    try {
      const res = await fetch(`/api/branch/cash?branchId=${user.branchId}`);
      const data = await res.json();
      if (data.success) {
        setTxns(data.transactions || []);
        setBalance(data.balance || 0);
        setCredits(data.credits || 0);
        setDebits(data.debits || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    load();
  }, [user]);

  // Real-time socket updates
  useEffect(() => {
    if (!user?.branchId) return;
    const socket = getSocket();
    socket.emit('join-room', `branch_${user.branchId}`);
    
    const refresh = () => load();
    socket.on('cash-updated', refresh);
    socket.on('fund-request-updated', refresh);
    
    return () => {
      socket.off('cash-updated', refresh);
      socket.off('fund-request-updated', refresh);
    };
  }, [user]);

  // Fetch list of branches for transfers
  useEffect(() => {
    if (!user?.branchId) return;
    fetch('/api/admin/branches')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          // Exclude the current branch from the dropdown
          setBranches((d.branches || []).filter((b) => b.id !== user.branchId));
        }
      })
      .catch(() => {});
  }, [user?.branchId]);

  // Computations for the form
  const amountNum = parseFloat(form.amount) || 0;
  const willOverdraw = amountNum > 0 && amountNum > balance;
  const remainingAfter = Math.max(0, balance - amountNum);
  
  const isTransfer = form.purpose.toLowerCase().includes('transfer');
  const missingTarget = isTransfer && !targetBranchId;

  const handlePurposeChange = (e) => {
    const val = e.target.value;
    setForm({ ...form, purpose: val });
    // Reset target branch if they change away from a transfer
    if (!val.toLowerCase().includes('transfer')) {
      setTargetBranchId('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.amount || !form.purpose) {
      toast.error('Fill all required fields');
      return;
    }
    if (amountNum <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    if (willOverdraw) {
      toast.error(`Insufficient balance. Available ₹${balance.toFixed(2)}`);
      return;
    }
    if (missingTarget) {
      toast.error('Please select a destination branch for the transfer');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/branch/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: user.branchId,
          type: 'DEBIT',
          amount: amountNum,
          purpose: form.purpose,
          description: form.description || null,
          createdBy: user.id,
          targetBranchId: isTransfer ? targetBranchId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(isTransfer ? '✅ Transfer recorded' : '✅ Debit recorded');
      setForm({ amount: '', purpose: '', description: '' });
      setTargetBranchId('');
      setShowAdd(false);
      load();
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

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BanknotesIcon className="w-8 h-8 text-yellow-600" /> Cash
          </h1>
          <p className="text-gray-500 mt-1">
            Branch cash ledger — credits from HO fund approvals
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          disabled={balance <= 0}
          title={balance <= 0 ? 'No balance available' : ''}
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-5 py-3 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="w-5 h-5" /> Record Debit
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-5 text-black">
          <p className="text-sm opacity-80">Available Balance</p>
          <p className="text-3xl font-bold mt-1">₹{balance.toFixed(2)}</p>
          <p className="text-[11px] opacity-80 mt-1">
            Only this amount can be spent
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <ArrowDownIcon className="w-4 h-4 text-green-500" /> Total Credits
          </p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            ₹{credits.toFixed(2)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            From HO or other branches
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <ArrowUpIcon className="w-4 h-4 text-red-500" /> Total Debits
          </p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            ₹{debits.toFixed(2)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Spent or transferred out
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">How branch cash works</p>
          <p className="mt-1 text-[13px] text-blue-700">
            Funds enter this account <strong>only</strong> when the HO approves
            a fund request or another branch transfers funds to you. You can record 
            debits for expenses, payments, or transfers up to the available balance.
          </p>
        </div>
      </div>

      {/* Debit / Transfer form */}
      {showAdd && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-md p-6 space-y-4 border-t-4 border-red-500"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 10000"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className={`w-full border-2 rounded-xl px-4 py-2.5 outline-none transition ${
                willOverdraw
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-gray-200 focus:border-yellow-500'
              }`}
            />
            {willOverdraw ? (
              <p className="text-xs text-red-600 mt-1">
                ⚠ Exceeds available balance (₹{balance.toFixed(2)})
              </p>
            ) : (
              amountNum > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Remaining after transaction: ₹{remainingAfter.toFixed(2)}
                </p>
              )
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purpose <span className="text-red-500">*</span>
            </label>
            <select
              value={form.purpose}
              onChange={handlePurposeChange}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
            >
              <option value="">Select purpose</option>
              <option value="Branch expenses">Branch expenses</option>
              <option value="Salary / wages">Salary / wages</option>
              <option value="Petty cash">Petty cash</option>
              <option value="Transfer to HO">Transfer to HO</option>
              <option value="Transfer to another branch">Transfer to another branch</option>
              <option value="Emergency">Emergency</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Conditional Transfer Target Branch Dropdown */}
          {isTransfer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination Branch <span className="text-red-500">*</span>
              </label>
              <select
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                className={`w-full border-2 rounded-xl px-4 py-2.5 outline-none transition ${
                  missingTarget ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-yellow-500'
                }`}
              >
                <option value="">Select destination</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code}) {b.isHeadOffice ? '• Head Office' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                A matching credit will appear in the destination branch's ledger immediately.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Add more context..."
              rows={2}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="flex-1 bg-gray-100 py-3 rounded-xl font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || willOverdraw || amountNum <= 0 || missingTarget}
              className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Record Transaction'}
            </button>
          </div>
        </motion.form>
      )}

      {/* Transactions Ledger */}
      <div className="bg-white rounded-2xl shadow-md divide-y divide-gray-100">
        {txns.length === 0 ? (
          <p className="p-8 text-center text-gray-500">
            No transactions yet.
          </p>
        ) : (
          txns.map((t) => {
            const isCredit = t.type === 'CREDIT';
            const isFundCredit = isCredit && !t.counterBranch; // From HO, not a branch transfer

            return (
              <div
                key={t.id}
                className="px-6 py-4 flex justify-between items-center hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCredit
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {isCredit ? (
                      <ArrowDownIcon className="w-5 h-5" />
                    ) : (
                      <ArrowUpIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{t.purpose}</p>
                      
                      {/* Fund Request Badge */}
                      {isFundCredit && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                          <BuildingStorefrontIcon className="w-2.5 h-2.5" />
                          From HO
                        </span>
                      )}

                      {/* Transfer Branch Badges */}
                      {t.counterBranch && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                            isCredit ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          <BuildingStorefrontIcon className="w-2.5 h-2.5" />
                          {isCredit
                            ? `from ${t.counterBranch.name}`
                            : `to ${t.counterBranch.name}`}
                        </span>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-xs text-gray-500 truncate">
                        {t.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(t.createdAt).toLocaleString()}
                      {t.reference && (
                        <span className="ml-2 font-mono">
                          · ref #{t.reference.slice(-8)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <p
                  className={`font-bold whitespace-nowrap ml-4 ${
                    isCredit ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isCredit ? '+' : '−'} ₹{t.amount.toFixed(2)}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}