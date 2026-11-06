// D:\gold-centro\app\branch\reports\page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  DocumentChartBarIcon,
  CurrencyRupeeIcon,
  CubeIcon,
  PlusCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

export default function BranchReports() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    if (!user?.branchId) return;
    fetch(`/api/branch/reports/direct-purchases?branchId=${user.branchId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="p-4 text-red-500">Failed to load report.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <DocumentChartBarIcon className="w-8 h-8 text-yellow-600" /> Direct Purchase Report
          </h1>
          <p className="text-gray-500 mt-1">Purchases made directly by this branch</p>
        </div>
        <Link
          href="/branch/direct-purchase/new"
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition"
        >
          <PlusCircleIcon className="w-5 h-5" /> New Purchase
        </Link>
      </div>

      {/* 🚨 PENDING AGREEMENTS ALERT */}
      {data.pendingAgreements?.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-amber-900">
                Action Required: {data.pendingAgreements.length} Pending Agreement{data.pendingAgreements.length > 1 ? 's' : ''}
              </h2>
              <p className="text-sm text-amber-800 mt-1">
                These purchases were created but the signed agreement was not uploaded. The items are not in stock yet.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            {data.pendingAgreements.map(o => (
              <div key={o.id} className="flex flex-wrap justify-between items-center bg-white p-3 rounded-xl border border-amber-100 shadow-sm gap-2">
                <div>
                  <p className="font-bold text-gray-900">{o.customer?.name}</p>
                  <p className="text-xs text-gray-500">
                    Amount: ₹{o.finalPrice?.toFixed(2)} • {new Date(o.createdAt).toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/branch/direct-purchase/${o.id}/agreement`}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-lg flex items-center gap-1 transition"
                >
                  Upload Agreement <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🚨 PENDING PAYMENTS ALERT (NEW) */}
      {data.pendingPayments?.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <BanknotesIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-blue-900">
                Action Required: {data.pendingPayments.length} Pending Payment{data.pendingPayments.length > 1 ? 's' : ''}
              </h2>
              <p className="text-sm text-blue-800 mt-1">
                Agreements have been uploaded, but the payment/stock transfer is not completed. Resume to transfer funds and add items to stock.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            {data.pendingPayments.map(o => (
              <div key={o.id} className="flex flex-wrap justify-between items-center bg-white p-3 rounded-xl border border-blue-100 shadow-sm gap-2">
                <div>
                  <p className="font-bold text-gray-900">{o.customer?.name}</p>
                  <p className="text-xs text-gray-500">
                    Amount: ₹{o.finalPrice?.toFixed(2)} • {new Date(o.createdAt).toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/branch/direct-purchase/${o.id}/pay`}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2 rounded-lg flex items-center gap-1 transition"
                >
                  Resume Payment <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-5 text-black">
          <p className="text-sm opacity-80">Completed Purchases</p>
          <p className="text-3xl font-bold mt-1">{data.stats.count}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <CubeIcon className="w-4 h-4 text-purple-600" /> Total Weight Bought
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {data.stats.totalWeight.toFixed(2)}g
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <CurrencyRupeeIcon className="w-4 h-4 text-green-600" /> Total Amount Paid
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            ₹{data.stats.totalAmount.toFixed(2)}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-lg">Purchase History</h2>
        </div>
        {data.orders.length === 0 ? (
          <p className="p-12 text-center text-gray-500">No direct purchases recorded yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.orders.map((o) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition"
              >
                <div>
                  <p className="font-mono text-xs text-gray-400">#{o.id.slice(-8).toUpperCase()}</p>
                  <p className="font-medium text-gray-900 mt-0.5">{o.customer?.name}</p>
                  <p className="text-xs text-gray-500">
                    {o.customer?.phone} • Staff: {o.staff?.name || '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(o.createdAt).toLocaleString()} • {o.paymentMode}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{o.weight.toFixed(2)}g</p>
                  <p className="font-bold text-green-600">₹{o.finalPrice?.toFixed(2)}</p>
                  {o.purchaseAgreementUrl && (
                    <a
                      href={o.purchaseAgreementUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 hover:underline mt-1 inline-block font-medium"
                    >
                      View Agreement
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}