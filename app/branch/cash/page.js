// app/branch/cash/page.js
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
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <BanknotesIcon className="w-7 h-7 text-slate-400" /> Branch Cash
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your branch cash ledger and outgoing transfers
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          disabled={balance <= 0}
          title={balance <= 0 ? 'No balance available' : ''}
          className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="w-4 h-4" /> Record Debit
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-emerald-500 shadow-sm p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Available Balance</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide">Spendable amount</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <ArrowDownIcon className="w-4 h-4 text-emerald-500" /> Total Credits
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ₹{credits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide">From HO or branches</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <ArrowUpIcon className="w-4 h-4 text-red-500" /> Total Debits
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ₹{debits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide">Spent or transferred</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-start gap-4">
        <InformationCircleIcon className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-slate-800">How branch cash works</p>
          <p className="mt-1 text-slate-600 leading-relaxed">
            Funds enter this account <strong className="text-slate-900">only</strong> when the HO approves
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
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5"
        >
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-3">Record New Transaction</h3>
            
            <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wide">
              Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${
                willOverdraw
                  ? 'border-red-300 focus:ring-2 focus:ring-red-500 bg-red-50'
                  : 'border-slate-300 focus:ring-2 focus:ring-slate-900'
              }`}
            />
            {willOverdraw ? (
              <p className="text-xs text-red-600 mt-1.5 font-medium flex items-center gap-1">
                ⚠ Exceeds available balance (₹{balance.toFixed(2)})
              </p>
            ) : (
              amountNum > 0 && (
                <p className="text-xs text-slate-500 mt-1.5">
                  Remaining after transaction: <span className="font-semibold text-slate-700">₹{remainingAfter.toFixed(2)}</span>
                </p>
              )
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wide">
              Purpose <span className="text-red-500">*</span>
            </label>
            <select
              value={form.purpose}
              onChange={handlePurposeChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none bg-white transition-all"
            >
              <option value="">Select purpose...</option>
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
              <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wide">
                Destination Branch <span className="text-red-500">*</span>
              </label>
              <select
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${
                  missingTarget 
                    ? 'border-red-300 focus:ring-2 focus:ring-red-500' 
                    : 'border-slate-300 focus:ring-2 focus:ring-slate-900'
                }`}
              >
                <option value="">Select destination...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code}) {b.isHeadOffice ? '• Head Office' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5">
                A matching credit will appear in the destination branch's ledger immediately.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wide">
              Description (optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Add more context..."
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none resize-none transition-all"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="flex-1 bg-white border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || willOverdraw || amountNum <= 0 || missingTarget}
              className="flex-[2] bg-red-600 text-white font-medium py-2.5 rounded-lg shadow-sm disabled:opacity-50 transition-colors text-sm flex items-center justify-center"
            >
              {submitting ? 'Recording...' : 'Record Transaction'}
            </button>
          </div>
        </motion.form>
      )}

      {/* Transactions Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-900">Transaction Ledger</h3>
        </div>
        
        {txns.length === 0 ? (
          <p className="p-8 text-center text-slate-500 font-medium">
            No transactions recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {txns.map((t) => {
              const isCredit = t.type === 'CREDIT';
              const isFundCredit = isCredit && !t.counterBranch;

              return (
                <div
                  key={t.id}
                  className="px-6 py-4 flex justify-between items-center hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                        isCredit
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-red-50 text-red-600 border-red-100'
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
                        <p className="font-semibold text-slate-900 text-sm truncate">{t.purpose}</p>
                        
                        {/* Fund Request Badge */}
                        {isFundCredit && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-md font-medium inline-flex items-center gap-1">
                            <BuildingStorefrontIcon className="w-3 h-3" />
                            From HO
                          </span>
                        )}

                        {/* Transfer Branch Badges */}
                        {t.counterBranch && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium inline-flex items-center gap-1 border ${
                              isCredit 
                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                          >
                            <BuildingStorefrontIcon className="w-3 h-3" />
                            {isCredit
                              ? `from ${t.counterBranch.name}`
                              : `to ${t.counterBranch.name}`}
                          </span>
                        )}
                      </div>
                      
                      {t.description && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {t.description}
                        </p>
                      )}
                      
                      <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide">
                        {new Date(t.createdAt).toLocaleString('en-GB')}
                        {t.reference && (
                          <span className="ml-2 font-mono">
                            · Ref #{t.reference.slice(-8).toUpperCase()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <p
                    className={`font-bold whitespace-nowrap ml-4 text-base ${
                      isCredit ? 'text-emerald-600' : 'text-slate-900'
                    }`}
                  >
                    {isCredit ? '+' : '−'} ₹{t.amount.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}