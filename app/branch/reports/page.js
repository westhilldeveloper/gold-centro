// app/branch/reports/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  DocumentChartBarIcon,
  CurrencyRupeeIcon,
  CubeIcon,
  PlusCircleIcon,
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

  // ── Export Handlers (Unchanged) ──
  const exportCSV = () => {
    if (!data?.orders?.length) return toast.error('No data to export');
    const headers = ['Order ID', 'Date', 'Customer Name', 'Phone', 'Staff', 'Weight (g)', 'Amount (₹)', 'Payment Mode', 'Estimate Doc', 'Final Doc'];
    const rows = data.orders.map(o => [
      o.id, new Date(o.createdAt).toLocaleDateString(), `"${o.customer?.name || ''}"`,
      o.customer?.phone || '', o.staff?.name || '', o.weight.toFixed(2),
      (o.finalPrice || 0).toFixed(2), o.paymentMode || '',
      o.estimateAgreementUrl ? 'Yes' : 'No', o.purchaseAgreementUrl ? 'Yes' : 'No',
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Direct_Purchase_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handlePrint = () => window.print();

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 p-4 print:p-0 print:max-w-none print:space-y-4">
      <Toaster position="top-center" />

      {/* 1. Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <DocumentChartBarIcon className="w-7 h-7 text-slate-400" /> Direct Purchase Report
          </h1>
          <p className="text-sm text-slate-500 mt-1">Purchases made directly by {user.branch?.name || 'this branch'}</p>
        </div>
        <Link 
          href="/branch/direct-purchase/new" 
          className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-2.5 rounded-lg text-sm shadow-sm transition-colors"
        >
          <PlusCircleIcon className="w-4 h-4" /> New Purchase
        </Link>
      </div>

      {/* 2. Alerts Strip */}
      <div className="flex flex-wrap gap-3 print:hidden">
        <Link href="/branch/direct-purchase/pending" className="flex-1 sm:flex-none flex items-center gap-3 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 px-4 py-3 rounded-xl transition-colors group">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide group-hover:text-amber-700">Pending Agreements</p>
            <p className="text-lg font-bold text-slate-900 leading-tight">{data.stats.totalPending}</p>
          </div>
        </Link>
        
        <Link href="/branch/direct-purchase/cancelled" className="flex-1 sm:flex-none flex items-center gap-3 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 px-4 py-3 rounded-xl transition-colors group">
          <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            <XCircleIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide group-hover:text-red-700">Cancelled Orders</p>
            <p className="text-lg font-bold text-slate-900 leading-tight">{data.stats.cancelledCount}</p>
          </div>
        </Link>
      </div>

      {/* 3. Main Control Panel (Filters & Exports) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
        <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Date Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Time Period</span>
            
            {/* Segmented Control for Presets */}
            <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto hide-scrollbar">
              {DATE_PRESETS.map((p) => (
                <button 
                  key={p.value} 
                  onClick={() => setPreset(p.value)} 
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    preset === p.value 
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            
            {/* Custom Date Inputs */}
            {preset === 'custom' && (
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-transparent border-none text-sm px-2 py-1 outline-none text-slate-700" />
                <span className="text-slate-400 text-xs">to</span>
                <input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-transparent border-none text-sm px-2 py-1 outline-none text-slate-700" />
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-4">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors">
              <ArrowDownTrayIcon className="w-4 h-4" /> Export
            </button>
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors">
              <PrinterIcon className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* 4. Financial Stats (Tabular focus) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 print:border-gray-300">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Completed Orders</p>
          <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums print:text-black">{data.stats.count}</p>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 print:border-gray-300">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <CubeIcon className="w-4 h-4 text-slate-400" /> Total Weight
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums print:text-black">
            {data.stats.totalWeight.toFixed(2)}<span className="text-lg font-medium text-slate-400 ml-1">g</span>
          </p>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-emerald-500 shadow-sm p-5 print:border-gray-300">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <CurrencyRupeeIcon className="w-4 h-4 text-emerald-500" /> Total Paid
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums print:text-black">
            ₹{data.stats.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* 5. Data Table (Grid Structure) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-gray-300">
        
        {/* Table Header (Desktop only) */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wide print:hidden">
          <div className="col-span-4">Customer & Order</div>
          <div className="col-span-3">Date & Staff</div>
          <div className="col-span-2 text-right">Weight</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-1 text-right">Docs</div>
        </div>

        {data.orders.length === 0 ? (
          <p className="p-12 text-center text-slate-500 font-medium">No purchases found for this period.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.orders.map((o) => (
              <motion.div 
                key={o.id} 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-6 py-4 items-center hover:bg-slate-50/80 transition-colors print:py-2 print:hover:bg-transparent"
              >
                {/* Column 1: Customer & ID */}
                <div className="col-span-4 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{o.customer?.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{o.id.slice(-6).toUpperCase()}</span>
                    <p className="text-xs text-slate-500 truncate">{o.customer?.phone}</p>
                  </div>
                </div>

                {/* Column 2: Date & Staff */}
                <div className="col-span-3 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">Staff: {o.staff?.name || '—'}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {new Date(o.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Column 3: Weight */}
                <div className="col-span-2 md:text-right mt-2 md:mt-0 flex justify-between md:block border-t border-slate-100 md:border-none pt-2 md:pt-0">
                  <span className="md:hidden text-xs text-slate-500">Weight</span>
                  <p className="font-bold text-slate-900 text-sm tabular-nums">{o.weight.toFixed(3)}<span className="text-xs text-slate-500 font-normal ml-0.5">g</span></p>
                </div>

                {/* Column 4: Amount */}
                <div className="col-span-2 md:text-right flex justify-between md:block">
                  <span className="md:hidden text-xs text-slate-500">Amount</span>
                  <p className="font-bold text-slate-900 text-sm tabular-nums">₹{o.finalPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-slate-500 md:mt-0.5 uppercase tracking-wide">{o.paymentMode || 'CASH'}</p>
                </div>

                {/* Column 5: Documents */}
                <div className="col-span-1 flex md:justify-end gap-1.5 mt-3 md:mt-0 pt-3 md:pt-0 border-t border-slate-100 md:border-none print:hidden">
                  {o.estimateAgreementUrl && (
                    <a href={o.estimateAgreementUrl} target="_blank" rel="noreferrer" title="Estimate Document" className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md transition-colors">
                      <DocumentTextIcon className="w-4 h-4" />
                    </a>
                  )}
                  {o.purchaseAgreementUrl && (
                    <a href={o.purchaseAgreementUrl} target="_blank" rel="noreferrer" title="Final Purchase Document" className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md transition-colors">
                      <DocumentTextIcon className="w-4 h-4" />
                    </a>
                  )}
                  {!o.estimateAgreementUrl && !o.purchaseAgreementUrl && (
                    <span className="text-[10px] text-slate-300 italic">No Docs</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Print Styles */}
      <div className="hidden print:block text-center text-xs text-gray-500 mt-8">
        Generated on {new Date().toLocaleString('en-GB')} by {user.name} ({user.branch?.code})
      </div>
    </div>
  );
}