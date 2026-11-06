'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ClipboardDocumentListIcon,
  CubeIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import AgentStatCard from '../components/AgentStatCard';

export default function AgentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/agent/dashboard?agentId=${user.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.stats);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.name}</p>
      </div>

      {/* Stat cards — expanded to 5 columns on large screens */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <AgentStatCard
          label="Pending Action"
          value={stats.pendingOrders}
          icon={ClockIcon}
          color="orange"
          subtitle="Needs your attention"
        />
        <AgentStatCard
          label="Active Orders"
          value={stats.activeOrders}
          icon={ClipboardDocumentListIcon}
          color="blue"
          subtitle={`${stats.totalOrders} total orders`}
        />
        <AgentStatCard
          label="Completed Today"
          value={stats.completedToday}
          icon={CheckCircleIcon}
          color="green"
        />
        <AgentStatCard
          label="Cash Balance"
          value={`₹${stats.cashBalance.toFixed(0)}`}
          icon={BanknotesIcon}
          color="yellow"
          subtitle={`Credits ₹${stats.cashCredits.toFixed(0)}`}
        />
        <AgentStatCard
          label="In Custody"
          value={`${Object.values(stats.custodyTotals).reduce((s, w) => s + w, 0).toFixed(2)}g`}
          icon={CubeIcon}
          color="purple"
          subtitle="Not yet deposited"
        />
      </div>

      {/* Gold breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-md p-6"
        >
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <CubeIcon className="w-5 h-5 text-purple-600" />
            Gold in Custody
          </h2>
          {Object.keys(stats.custodyTotals).length === 0 ? (
            <p className="text-gray-400 text-sm">No gold currently held.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.custodyTotals).map(([purity, weight]) => (
                <div key={purity} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-600">{purity}</span>
                  <span className="font-bold text-gray-900">{weight.toFixed(2)}g</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl shadow-md p-6"
        >
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            Deposited to Branch
          </h2>
          {Object.keys(stats.depositsTotals).length === 0 ? (
            <p className="text-gray-400 text-sm">No deposits yet.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.depositsTotals).map(([purity, weight]) => (
                <div key={purity} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-600">{purity}</span>
                  <span className="font-bold text-gray-900">{weight.toFixed(2)}g</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/agent/orders"
            className="flex items-center justify-between bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-xl p-4 transition"
          >
            <span className="font-medium text-yellow-800">View Orders</span>
            <ArrowRightIcon className="w-4 h-4 text-yellow-700" />
          </Link>
          <Link
            href="/agent/gold"
            className="flex items-center justify-between bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl p-4 transition"
          >
            <span className="font-medium text-purple-800">Gold Status</span>
            <ArrowRightIcon className="w-4 h-4 text-purple-700" />
          </Link>
          <Link
            href="/agent/cash"
            className="flex items-center justify-between bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl p-4 transition"
          >
            <span className="font-medium text-green-800">Cash Ledger</span>
            <ArrowRightIcon className="w-4 h-4 text-green-700" />
          </Link>
        </div>
      </div>
    </div>
  );
}