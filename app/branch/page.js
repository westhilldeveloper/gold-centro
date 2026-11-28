// app/branch/page.js (or wherever your BranchDashboard is located)
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserGroupIcon, CubeIcon, BanknotesIcon, ArrowDownTrayIcon,
  UsersIcon, ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

// Safe formatting helper
const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

export default function BranchDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.branchId) return;
    fetch(`/api/branch/dashboard?branchId=${user.branchId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d.stats); })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  // Define the cards with specific accent colors (Border & Icon)
  const cards = [
    {
      label: 'Agents',
      value: stats.totalAgents,
      icon: UserGroupIcon,
      borderColor: 'border-l-blue-500',
      iconColor: 'text-blue-600 bg-blue-50',
      href: '/branch/agents',
    },
    {
      label: 'Staff',
      value: stats.totalStaff,
      icon: UsersIcon,
      borderColor: 'border-l-purple-500',
      iconColor: 'text-purple-600 bg-purple-50',
      href: '/branch/staff',
    },
    {
      label: 'Pending Deposits',
      value: stats.pendingDeposits,
      icon: ArrowDownTrayIcon,
      borderColor: 'border-l-amber-500',
      iconColor: 'text-amber-600 bg-amber-50',
      href: '/branch/deposits',
    },
    {
      label: 'Cash Balance',
      value: formatCurrency(stats.cashBalance),
      icon: BanknotesIcon,
      borderColor: 'border-l-emerald-500',
      iconColor: 'text-emerald-600 bg-emerald-50',
      href: '/branch/cash',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Overview</h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome back, {user.name} • {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c, i) => (
          <motion.div 
            key={c.label} 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <Link 
              href={c.href} 
              className={`group block bg-white rounded-xl p-6 border border-slate-200 border-l-4 ${c.borderColor} shadow-sm hover:shadow-md transition-all duration-200`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{c.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2 group-hover:text-slate-700 transition-colors">
                    {c.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${c.iconColor}`}>
                  <c.icon className="w-6 h-6" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Lower Data Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Current Stock Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <CubeIcon className="w-5 h-5 text-slate-400" /> Current Stock
            </h2>
            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {Object.keys(stats.stockTotals).length} Purities
            </span>
          </div>
          <div className="p-6">
            {Object.keys(stats.stockTotals).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">No stock available in branch.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {Object.entries(stats.stockTotals).map(([purity, weight]) => (
                  <div key={purity} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                    <span className="text-sm font-medium text-slate-600">{purity} Gold</span>
                    <span className="text-sm font-bold text-slate-900">
                      {weight.toFixed(3)} <span className="text-slate-400 font-normal">g</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Agent Custody Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5 text-slate-400" /> Agent Custody
            </h2>
            {Object.keys(stats.custodyTotals).length === 0 && (
              <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> All Cleared
              </span>
            )}
          </div>
          <div className="p-6">
            {Object.keys(stats.custodyTotals).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">All deposits cleared ✅</p>
              </div>
            ) : (
              <div className="space-y-1">
                {Object.entries(stats.custodyTotals).map(([purity, weight]) => (
                  <div key={purity} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                    <span className="text-sm font-medium text-slate-600">{purity} Gold</span>
                    <span className="text-sm font-bold text-amber-600">
                      {weight.toFixed(3)} <span className="text-amber-500/50 font-normal">g</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}