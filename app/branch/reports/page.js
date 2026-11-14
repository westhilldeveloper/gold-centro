// app/branch/reports/page.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  DocumentChartBarIcon,
  CurrencyRupeeIcon,
  CubeIcon,
  PlusCircleIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom', value: 'custom' },
];

export default function BranchReports() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Date Filter State
  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Apply preset to date range
  useEffect(() => {
    const today = new Date();
    let start = '', end = '';

    if (preset === 'today') {
      start = end = today.toISOString().split('T')[0];
    } else if (preset === 'week') {
      const first = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
      const monday = new Date(today.setDate(first));
      start = monday.toISOString().split('T')[0];
      end = new Date().toISOString().split('T')[0];
    } else if (preset === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      end = new Date().toISOString().split('T')[0];
    } else if (preset === 'all') {
      start = '';
      end = '';
    }

    if (preset !== 'custom') {
      setFrom(start);
      setTo(end);
    }
  }, [preset]);

  // Fetch Data
  useEffect(() => {
    if (!user?.branchId) return;
    setLoading(true);
    
    const params = new URLSearchParams({ branchId: user.branchId });
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    fetch(`/api/branch/reports/direct-purchases?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d); })
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [user, from, to]);

  // ── Export Handlers ──
  const exportCSV = () => {
    if (!data?.orders?.length) return toast.error('No data to export');
    
    const headers = ['Order ID', 'Date', 'Customer Name', 'Phone', 'Staff', 'Weight (g)', 'Amount (₹)', 'Payment Mode', 'Estimate Doc', 'Final Doc'];
    const rows = data.orders.map(o => [
      o.id,
      new Date(o.createdAt).toLocaleDateString(),
      `"${o.customer?.name || ''}"`,
      o.customer?.phone || '',
      o.staff?.name || '',
      o.weight.toFixed(2),
      (o.finalPrice || 0).toFixed(2),
      o.paymentMode || '',
      o.estimateAgreementUrl ? 'Yes' : 'No',
      o.purchaseAgreementUrl ? 'Yes' : 'No',
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Direct_Purchase_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => window.print();

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 print:p-0">
      <Toaster position="top-center" />

      {/* Header (Hidden on Print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <DocumentChartBarIcon className="w-7 h-7 md:w-8 md:h-8 text-yellow-600" /> Direct Purchase Report
          </h1>
          <p className="text-gray-500 mt-1">Purchases made directly by this branch</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/branch/direct-purchase/pending" className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold px-4 py-2.5 rounded-xl text-sm">
            <ExclamationTriangleIcon className="w-4 h-4" /> Pending ({data.stats.totalPending})
          </Link>
          <Link href="/branch/direct-purchase/cancelled" className="flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold px-4 py-2.5 rounded-xl text-sm">
            <XCircleIcon className="w-4 h-4" /> Cancelled ({data.stats.cancelledCount})
          </Link>
          <Link href="/branch/direct-purchase/new" className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition text-sm">
            <PlusCircleIcon className="w-5 h-5" /> New Purchase
          </Link>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">Gold Centro - Direct Purchase Report</h1>
        <p className="text-sm text-gray-600">Branch: {user.branch?.name} | Date Range: {from || 'Start'} to {to || 'Today'}</p>
      </div>

      {/* Filter & Export Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 mr-2">Date Range:</span>
          {DATE_PRESETS.map((p) => (
            <button key={p.value} onClick={() => setPreset(p.value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${preset === p.value ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border-2 border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none" />
            <span className="text-gray-400">to</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border-2 border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none" />
          </div>
        )}

        <div className="flex gap-2 ml-auto">
          <button onClick={exportCSV} className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 font-bold px-3 py-1.5 rounded-lg text-xs border border-green-200">
            <ArrowDownTrayIcon className="w-4 h-4" /> Excel
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-lg text-xs border border-blue-200">
            <PrinterIcon className="w-4 h-4" /> PDF / Print
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-5 text-black print:bg-white print:border print:border-gray-300">
          <p className="text-sm opacity-80 font-medium">Completed Purchases</p>
          <p className="text-3xl font-bold mt-1">{data.stats.count}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5 print:shadow-none print:border print:border-gray-300">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <CubeIcon className="w-4 h-4 text-purple-600" /> Total Weight
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.totalWeight.toFixed(2)}g</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5 print:shadow-none print:border print:border-gray-300">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <CurrencyRupeeIcon className="w-4 h-4 text-green-600" /> Total Paid
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">₹{data.stats.totalAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden print:shadow-none print:border print:border-gray-300">
        <div className="px-5 md:px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-lg">Completed Purchase History</h2>
        </div>
        {data.orders.length === 0 ? (
          <p className="p-12 text-center text-gray-500">No purchases found for this date range.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.orders.map((o) => (
              <motion.div key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 md:px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 hover:bg-gray-50 transition print:py-2 print:hover:bg-transparent">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-gray-400">#{o.id.slice(-8).toUpperCase()}</p>
                  <p className="font-medium text-gray-900 mt-0.5 truncate">{o.customer?.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {o.customer?.phone} • Staff: {o.staff?.name || '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(o.createdAt).toLocaleString()} • {o.paymentMode}
                  </p>
                </div>
                
                <div className="flex flex-col sm:items-end gap-2 flex-shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="font-bold text-gray-900">{o.weight.toFixed(2)}g</p>
                    <p className="font-bold text-green-600">₹{o.finalPrice?.toFixed(2)}</p>
                  </div>
                  
                  {/* Documents - Hidden on Print, replaced with text if needed */}
                  <div className="flex gap-2 print:hidden">
                    {o.estimateAgreementUrl && (
                      <a href={o.estimateAgreementUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-2 py-1 rounded inline-flex items-center gap-1 font-medium">
                        <DocumentTextIcon className="w-3 h-3" /> Est. Doc
                      </a>
                    )}
                    {o.purchaseAgreementUrl && (
                      <a href={o.purchaseAgreementUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 px-2 py-1 rounded inline-flex items-center gap-1 font-medium">
                        <DocumentTextIcon className="w-3 h-3" /> Final Doc
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Print-specific footer */}
      <div className="hidden print:block text-center text-xs text-gray-500 mt-8">
        Generated on {new Date().toLocaleString()} by {user.name} ({user.branch?.code})
      </div>
    </div>
  );
}