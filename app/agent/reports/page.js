// app/agent/reports/page.js
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

  const { summary, orders } = data;

  return (
    // Added w-full, max-w-full, and overflow-hidden to prevent page blowout
    <div className="w-full max-w-6xl mx-auto space-y-4 md:space-y-6 p-4 md:p-0 overflow-hidden">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ChartBarIcon className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" /> Reports
          </h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Your performance summary</p>
        </div>
        <button
          onClick={handlePrint}
          className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <PrinterIcon className="w-5 h-5" /> Print
        </button>
      </div>

      {/* Date range filter */}
      <div className="bg-white rounded-2xl shadow-md p-4 flex flex-col sm:flex-row gap-3 sm:items-center print:hidden w-full">
        <span className="text-sm font-medium text-gray-600">Date range:</span>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <input 
            type="date" 
            value={from} 
            onChange={(e) => setFrom(e.target.value)}
            className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-yellow-500 outline-none w-full sm:w-auto" 
          />
          <span className="text-gray-400 text-sm">to</span>
          <input 
            type="date" 
            value={to} 
            onChange={(e) => setTo(e.target.value)}
            className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-yellow-500 outline-none w-full sm:w-auto" 
          />
        </div>
        {(from || to) && (
          <button 
            onClick={() => { setFrom(''); setTo(''); }}
            className="text-sm text-red-500 hover:text-red-700 font-medium sm:ml-auto text-left mt-2 sm:mt-0"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Summary cards - Changed to 1 column on mobile, 2 on tablets, 4 on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full min-w-0">
        <AgentStatCard label="Gold Purchased" value={`${summary.totalGoldPurchased.toFixed(2)}g`} color="purple" />
        <AgentStatCard label="Total Paid" value={`₹${summary.totalPaid.toFixed(0)}`} color="yellow" />
        <AgentStatCard label="Deposited" value={`${summary.totalDeposited.toFixed(2)}g`} color="green" />
        <AgentStatCard label="Balance" value={`₹${summary.balance.toFixed(0)}`} color="blue" />
      </div>

      {/* Cash summary */}
      <div className="bg-white rounded-2xl shadow-md p-4 md:p-6 w-full min-w-0">
        <h2 className="font-semibold text-lg mb-4">Cash Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-sm text-green-700">Total Credits</p>
            <p className="text-2xl font-bold text-green-800 break-words">₹{summary.totalCredits.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <p className="text-sm text-red-700">Total Debits</p>
            <p className="text-2xl font-bold text-red-800 break-words">₹{summary.totalDebits.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Orders list */}
      <div className="bg-white rounded-2xl shadow-md p-4 md:p-6 w-full min-w-0">
        <h2 className="font-semibold text-lg mb-4">Orders ({orders.length})</h2>
        {orders.length === 0 ? (
          <p className="text-gray-400 text-sm">No orders in range.</p>
        ) : (
          // Crucial: overflow-x-auto with w-full and max-w-full prevents the table from stretching the page
          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-3 text-xs text-gray-500 uppercase whitespace-nowrap">ID</th>
                  <th className="py-2 px-3 text-xs text-gray-500 uppercase whitespace-nowrap">Customer</th>
                  <th className="py-2 px-3 text-xs text-gray-500 uppercase whitespace-nowrap text-right">Weight</th>
                  <th className="py-2 px-3 text-xs text-gray-500 uppercase whitespace-nowrap text-right hidden sm:table-cell">Purity</th>
                  <th className="py-2 px-3 text-xs text-gray-500 uppercase whitespace-nowrap text-right">Price</th>
                  <th className="py-2 px-3 text-xs text-gray-500 uppercase whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-3 font-mono text-xs text-gray-500 whitespace-nowrap">#{o.id.slice(-6)}</td>
                    <td className="py-3 px-3 text-gray-900 truncate max-w-[120px]">{o.customer?.name || '—'}</td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">{o.weight?.toFixed(2)}g</td>
                    <td className="py-3 px-3 text-right whitespace-nowrap hidden sm:table-cell">{o.purity}</td>
                    <td className="py-3 px-3 text-right font-medium text-gray-900 whitespace-nowrap">
                      ₹{(o.finalPrice || o.estimatedTotal || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        {o.status.replace(/_/g, ' ')}
                      </span>
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