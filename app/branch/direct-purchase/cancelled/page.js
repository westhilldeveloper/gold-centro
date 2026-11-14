// app/branch/direct-purchase/cancelled/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  PhotoIcon,
  UserCircleIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyRupeeIcon,
} from '@heroicons/react/24/outline';
import ImagePreview from '../../../components/ImagePreview';

const STAGE_STEPS = [
  { key: 'created', label: 'Order Created', icon: CheckCircleIcon },
  { key: 'preEstimation', label: 'Pre-Estimation Recorded', icon: CheckCircleIcon },
  { key: 'estimateAgreement', label: 'Estimate Agreement Signed', icon: DocumentTextIcon },
  { key: 'postEstimation', label: 'Post-Estimation Done', icon: CheckCircleIcon },
  { key: 'purchaseAgreement', label: 'Final Agreement Signed', icon: DocumentTextIcon },
];

export default function CancelledOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (!user?.branchId) return;
    fetch(`/api/branch/reports/direct-purchases?branchId=${user.branchId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrders(d.cancelledOrders || []);
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [user]);

  const toggle = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // Determine which stages were completed before cancellation
  const getStageProgress = (order) => {
    const hasPre = order.items?.some(
      (i) => parseFloat(i.preEstimationGrossWeight) > 0
    );
    const hasEstimateAgreement = !!order.estimateAgreementUrl;
    const hasPost = order.items?.some((i) => parseFloat(i.grossWeight) > 0);
    const hasPurchaseAgreement = !!order.purchaseAgreementUrl;
    return {
      created: true,
      preEstimation: !!hasPre,
      estimateAgreement: hasEstimateAgreement,
      postEstimation: hasPost,
      purchaseAgreement: hasPurchaseAgreement,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <Toaster position="top-center" />

      <div className="flex items-center gap-3">
        <Link
          href="/branch/reports"
          className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm"
        >
          <ArrowLeftIcon className="w-4 h-4" /> Back to Reports
        </Link>
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <XCircleIcon className="w-7 h-7 text-red-600" /> Cancelled Orders
        </h1>
        <p className="text-gray-500 mt-1">
          {orders.length} cancelled direct purchase{orders.length !== 1 ? 's' : ''}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center text-gray-500">
          <XCircleIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p>No cancelled orders.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const isOpen = expanded[o.id];
            const progress = getStageProgress(o);
            const itemCount = o.items?.length || 0;

            return (
              <div
                key={o.id}
                className="bg-white rounded-2xl shadow-md border border-red-100 overflow-hidden"
              >
                {/* Header row */}
                <button
                  onClick={() => toggle(o.id)}
                  className="w-full text-left px-5 md:px-6 py-4 hover:bg-red-50/30 transition"
                >
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                          CANCELLED
                        </span>
                        <span className="font-mono text-xs text-gray-500">
                          #{o.id.slice(-8).toUpperCase()}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 mt-1 truncate">
                        {o.customer?.name || 'Unknown Customer'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {o.customer?.phone}
                        {o.cancelledAt &&
                          ` • Cancelled ${new Date(o.cancelledAt).toLocaleDateString()}`}
                      </p>
                      {o.cancelReason && (
                        <p className="text-xs text-red-700 mt-1 italic">
                          "{o.cancelReason}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{itemCount} items</p>
                        {o.finalPrice > 0 && (
                          <p className="text-sm font-bold text-gray-700">
                            ₹{o.finalPrice.toFixed(2)}
                          </p>
                        )}
                      </div>
                      {isOpen ? (
                        <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-gray-100"
                    >
                      <div className="p-5 md:p-6 space-y-5 bg-gray-50/50">
                        {/* Pipeline */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            Pipeline — stages completed before cancellation
                          </p>
                          <div className="space-y-2">
                            {STAGE_STEPS.map((step, idx) => {
                              const done = progress[step.key];
                              const isLast = idx === STAGE_STEPS.length - 1;
                              return (
                                <div
                                  key={step.key}
                                  className="flex items-center gap-3 text-sm"
                                >
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      done
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-200 text-gray-400'
                                    }`}
                                  >
                                    {done ? (
                                      <CheckCircleIcon className="w-4 h-4" />
                                    ) : (
                                      <ClockIcon className="w-4 h-4" />
                                    )}
                                  </div>
                                  <p
                                    className={
                                      done
                                        ? 'text-gray-900 font-medium'
                                        : 'text-gray-400'
                                    }
                                  >
                                    {step.label}
                                    {!done && ' (not reached)'}
                                  </p>
                                </div>
                              );
                            })}
                            {/* Cancelled marker */}
                            <div className="flex items-center gap-3 text-sm">
                              <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
                                <XCircleIcon className="w-4 h-4" />
                              </div>
                              <p className="text-red-700 font-semibold">
                                Cancelled
                                {o.cancelReason && ` — ${o.cancelReason}`}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Customer + Staff */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-white rounded-xl p-3 border border-gray-100">
                            <div className="flex items-center gap-2 mb-1">
                              <UserCircleIcon className="w-4 h-4 text-gray-500" />
                              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                                Customer
                              </p>
                            </div>
                            <p className="font-semibold text-gray-900">
                              {o.customer?.name || '—'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {o.customer?.phone || '—'}
                            </p>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-gray-100">
                            <div className="flex items-center gap-2 mb-1">
                              <BuildingStorefrontIcon className="w-4 h-4 text-gray-500" />
                              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                                Handled by
                              </p>
                            </div>
                            <p className="font-semibold text-gray-900">
                              {o.staff?.name || '—'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Cancelled{' '}
                              {o.cancelledAt &&
                                new Date(o.cancelledAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Items */}
                        {itemCount > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Items ({itemCount})
                            </p>
                            <div className="space-y-2">
                              {o.items.map((it, i) => {
                                const img =
                                  Array.isArray(it.imageUrls) &&
                                  it.imageUrls.length > 0
                                    ? it.imageUrls[0]
                                    : null;
                                return (
                                  <div
                                    key={it.id || i}
                                    className="flex gap-3 bg-white rounded-lg p-2.5 border border-gray-100"
                                  >
                                    <button
                                      onClick={() =>
                                        img && setPreviewImage(img)
                                      }
                                      disabled={!img}
                                      className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0 disabled:cursor-default"
                                    >
                                      {img ? (
                                        <img
                                          src={img}
                                          alt={it.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <PhotoIcon className="w-6 h-6 text-gray-300" />
                                      )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium text-sm text-gray-900 truncate">
                                          {it.name}
                                        </p>
                                        {it.purity && (
                                          <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">
                                            {it.purity}
                                          </span>
                                        )}
                                        <span className="text-xs text-gray-500">
                                          ×{it.count}
                                        </span>
                                      </div>
                                      <div className="mt-1 grid grid-cols-4 gap-1 text-[10px] text-gray-600">
                                        <div>
                                          <span className="text-gray-400 block">
                                            Pre-Gross
                                          </span>
                                          <span className="font-semibold">
                                            {parseFloat(
                                              it.preEstimationGrossWeight || 0
                                            ).toFixed(2)}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 block">
                                            Gross
                                          </span>
                                          <span className="font-semibold">
                                            {parseFloat(
                                              it.grossWeight || 0
                                            ).toFixed(2)}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 block">
                                            Net
                                          </span>
                                          <span className="font-semibold text-yellow-700">
                                            {parseFloat(
                                              it.netWeight || 0
                                            ).toFixed(2)}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 block">
                                            Price
                                          </span>
                                          <span className="font-semibold text-green-700">
                                            ₹
                                            {parseFloat(
                                              it.itemPrice || 0
                                            ).toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Documents */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Documents Uploaded
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {o.estimateAgreementUrl ? (
                              <a
                                href={o.estimateAgreementUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg text-amber-800 hover:bg-amber-100 font-medium"
                              >
                                <DocumentTextIcon className="w-4 h-4" />
                                Estimate Agreement
                              </a>
                            ) : (
                              <span className="text-xs bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-gray-400 italic">
                                No estimate agreement
                              </span>
                            )}
                            {o.purchaseAgreementUrl ? (
                              <a
                                href={o.purchaseAgreementUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs bg-purple-50 border border-purple-200 px-3 py-2 rounded-lg text-purple-800 hover:bg-purple-100 font-medium"
                              >
                                <DocumentTextIcon className="w-4 h-4" />
                                Final Purchase Agreement
                              </a>
                            ) : (
                              <span className="text-xs bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-gray-400 italic">
                                No final agreement
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <ImagePreview
        src={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}