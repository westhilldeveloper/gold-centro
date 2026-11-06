'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function DepositsPage() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/deposits')
      .then((r) => r.json())
      .then((d) => { if (d.success) setDeposits(d.deposits); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ArrowDownTrayIcon className="w-8 h-8 text-yellow-600" /> Agent Deposits
        </h1>
        <p className="text-gray-500 mt-1">All gold deposits made by agents to branches</p>
      </div>

      {deposits.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <ArrowDownTrayIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No deposits recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="divide-y divide-gray-100">
            {deposits.map((d) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <p className="font-mono text-xs text-gray-400">#{d.id.slice(-8)}</p>
                    <p className="text-sm mt-1">
                      <span className="text-gray-500">From:</span>{' '}
                      <span className="font-medium">{d.agent?.name}</span>
                      <span className="text-gray-400 ml-1">({d.agent?.phone})</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500">To Branch:</span>{' '}
                      <span className="font-medium">{d.branch?.name}</span>
                      <span className="text-xs text-gray-400 font-mono ml-1">({d.branch?.code})</span>
                    </p>
                    <p className="text-sm font-semibold text-blue-600 mt-1">
                      {d.weight.toFixed(2)}g ({d.purity})
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(d.depositedAt).toLocaleString()}
                      {d.notes && ` • ${d.notes}`}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>{d.orderIds.length} order(s) included</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}