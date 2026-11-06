'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserGroupIcon, CubeIcon, BanknotesIcon, ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

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
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    {
      label: 'Agents',
      value: stats.totalAgents,
      icon: UserGroupIcon,
      color: 'from-blue-500 to-blue-600',
      href: '/branch/agents',
    },
    {
      label: 'Staff',
      value: stats.totalStaff,
      icon: UserGroupIcon,
      color: 'from-purple-500 to-purple-600',
      href: '/branch/staff',
    },
    {
      label: 'Pending Deposits',
      value: stats.pendingDeposits,
      icon: ArrowDownTrayIcon,
      color: 'from-orange-500 to-orange-600',
      href: '/branch/deposits',
    },
    {
      label: 'Cash Balance',
      value: `₹${stats.cashBalance.toFixed(0)}`,
      icon: BanknotesIcon,
      color: 'from-green-500 to-green-600',
      href: '/branch/cash',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome, {user.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={c.href} className={`block bg-gradient-to-br ${c.color} rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition`}>
              <c.icon className="w-8 h-8 opacity-80" />
              <p className="text-sm mt-4 opacity-90">{c.label}</p>
              <p className="text-2xl font-bold mt-1">{c.value}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <CubeIcon className="w-5 h-5 text-yellow-600" /> Current Stock
          </h2>
          {Object.keys(stats.stockTotals).length === 0 ? (
            <p className="text-gray-400">No stock yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.stockTotals).map(([purity, weight]) => (
                <div key={purity} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-600">{purity}</span>
                  <span className="font-bold text-gray-900">{weight.toFixed(2)}g</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5 text-orange-600" /> Agent Custody
          </h2>
          {Object.keys(stats.custodyTotals).length === 0 ? (
            <p className="text-gray-400">All deposits cleared ✅</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.custodyTotals).map(([purity, weight]) => (
                <div key={purity} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-600">{purity}</span>
                  <span className="font-bold text-orange-600">{weight.toFixed(2)}g</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}