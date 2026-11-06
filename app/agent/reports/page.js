'use client';

import { useState, useEffect } from 'react';
import { ChartBarIcon, PrinterIcon } from '@heroicons/react/24/outline';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AgentStatCard from '../../components/AgentStatCard';

export default function AgentReportsPage() {
  const { user } = useAuth();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ agentId: user.id });
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const res = await fetch(`/api/agent/reports?${params}`);
      const d = await res.json();
      if (d.success) setData(d);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user, from, to]);

  const handlePrint = () => window.print();

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { summary, orders, deposits, cash } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Toaster position="top-center" />

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ChartBarIcon className="w-8 h-8 text-yellow-600" /> Reports
          </h1>
          <p className="text-gray-500 mt-1">Your performance summary</p>
        </div>
        <button
          onClick={handlePrint}
          className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2"
        >
          <PrinterIcon className="w-5 h-5" /> Print
        </button>
      </div>

      {/* Date range filter */}
      <div className="bg-white rounded-2xl shadow-md p-4 flex flex-wrap gap-3 items-center print:hidden">
        <span className="text-sm text-gray-500">Date range:</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-yellow-500 outline-none" />
        <span className="text-gray-400">to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-yellow-500 outline-none" />
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); }}
            className="text-sm text-red-500 hover:text-red-700">Clear</button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AgentStatCard label="Gold Purchased" value={`${summary.totalGoldPurchased.toFixed(2)}g`} color="purple" />
        <AgentStatCard label="Total Paid" value={`₹${summary.totalPaid.toFixed(0)}`} color="yellow" />
        <AgentStatCard label="Deposited" value={`${summary.totalDeposited.toFixed(2)}g`} color="green" />
        <AgentStatCard label="Balance" value={`₹${summary.balance.toFixed(0)}`} color="blue" />
      </div>

      {/* Cash summary */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="font-semibold text-lg mb-4">Cash Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-sm text-green-700">Total Credits</p>
            <p className="text-2xl font-bold text-green-800">₹{summary.totalCredits.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <p className="text-sm text-red-700">Total Debits</p>
            <p className="text-2xl font-bold text-red-800">₹{summary.totalDebits.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Orders list */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="font-semibold text-lg mb-4">Orders ({orders.length})</h2>
        {orders.length === 0 ? (
          <p className="text-gray-400 text-sm">No orders in range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 uppercase">ID</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 uppercase">Customer</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-500 uppercase">Weight</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-500 uppercase">Purity</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-500 uppercase">Price</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 px-3 font-mono text-xs">#{o.id.slice(-6)}</td>
                    <td className="py-2 px-3">{o.customer?.name || '—'}</td>
                    <td className="py-2 px-3 text-right">{o.weight?.toFixed(2)}g</td>
                    <td className="py-2 px-3 text-right">{o.purity}</td>
                    <td className="py-2 px-3 text-right font-medium">
                      ₹{(o.finalPrice || o.estimatedTotal || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}