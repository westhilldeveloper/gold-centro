'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

export default function CashPage() {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [credits, setCredits] = useState(0);
  const [debits, setDebits] = useState(0);
  const [loading, setLoading] = useState(false);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: 'CREDIT', amount: '', purpose: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  // Load branches
  useEffect(() => {
    fetch('/api/admin/branches')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setBranches(d.branches);
          if (d.branches.length > 0) setSelectedBranch(d.branches[0].id);
        }
      });
  }, []);

  // Load transactions when branch changes
  const fetchTransactions = async () => {
    if (!selectedBranch) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/branches/${selectedBranch}/cash`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
        setBalance(data.balance);
        setCredits(data.credits);
        setDebits(data.debits);
      }
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [selectedBranch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.purpose) { toast.error('Amount and purpose required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/branches/${selectedBranch}/cash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount), createdBy: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Transaction added!');
      setShowAdd(false);
      setForm({ type: 'CREDIT', amount: '', purpose: '', description: '' });
      fetchTransactions();
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BanknotesIcon className="w-8 h-8 text-yellow-600" /> Cash Management
          </h1>
          <p className="text-gray-500 mt-1">Track petty cash and branch balances</p>
        </div>
        <div className="flex gap-3 items-center">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
          >
            {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
          </select>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg"
          >
            <PlusIcon className="w-5 h-5" /> Add
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl shadow-md p-5 text-black">
          <p className="text-sm font-medium opacity-80">Available Balance</p>
          <p className="text-3xl font-bold mt-1">₹{balance.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="text-sm text-gray-500 flex items-center gap-1"><ArrowDownIcon className="w-4 h-4 text-green-500" /> Total Credits</p>
          <p className="text-2xl font-bold text-green-600 mt-1">₹{credits.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="text-sm text-gray-500 flex items-center gap-1"><ArrowUpIcon className="w-4 h-4 text-red-500" /> Total Debits</p>
          <p className="text-2xl font-bold text-red-600 mt-1">₹{debits.toFixed(2)}</p>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-md p-6 space-y-4 border-t-4 border-yellow-500"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none">
                <option value="CREDIT">Credit (Add cash)</option>
                <option value="DEBIT">Debit (Spend cash)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
              <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
              <input type="text" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="e.g. Gold purchase, Petty cash"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowAdd(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-3 rounded-xl shadow-md disabled:opacity-50">
              {submitting ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </motion.form>
      )}

      {/* Transactions list */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold">Transaction History</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    t.type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {t.type === 'CREDIT' ? <ArrowDownIcon className="w-5 h-5" /> : <ArrowUpIcon className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t.purpose}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(t.createdAt).toLocaleString()}
                      {t.description && ` • ${t.description}`}
                    </p>
                  </div>
                </div>
                <p className={`font-bold ${t.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'CREDIT' ? '+' : '-'} ₹{t.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}