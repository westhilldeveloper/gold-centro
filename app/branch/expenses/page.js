'use client';

import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { ReceiptPercentIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

export default function BranchExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: 'OFFICE', amount: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user?.branchId) return;
    const res = await fetch(`/api/branch/expenses?branchId=${user.branchId}`);
    const d = await res.json();
    if (d.success) setExpenses(d.expenses);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount) { toast.error('Amount required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/branch/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount), branchId: user.branchId, createdBy: user.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success('Expense recorded');
      setShowAdd(false);
      setForm({ category: 'OFFICE', amount: '', description: '' });
      load();
    } catch (err) { toast.error('❌ ' + err.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ReceiptPercentIcon className="w-8 h-8 text-yellow-600" /> Expenses
          </h1>
          <p className="text-gray-500 mt-1">Total: ₹{total.toFixed(2)}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-5 py-3 rounded-xl">
          <PlusIcon className="w-5 h-5" /> Add Expense
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-4 border-t-4 border-yellow-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none">
              <option value="OFFICE">Office</option>
              <option value="TRAVEL">Travel</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="PURCHASE">Purchase</option>
              <option value="OTHER">Other</option>
            </select>
            <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none" />
            <input type="text" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-medium">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-3 rounded-xl disabled:opacity-50">
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-md divide-y divide-gray-100">
        {expenses.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No expenses yet.</p>
        ) : expenses.map((e) => (
          <div key={e.id} className="px-6 py-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{e.description || e.category}</p>
              <p className="text-xs text-gray-500">{e.category} • {new Date(e.createdAt).toLocaleString()}</p>
            </div>
            <p className="font-bold text-gray-900">₹{e.amount.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}