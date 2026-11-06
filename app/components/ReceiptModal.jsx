// D:\gold-centro\app\components\ReceiptModal.jsx
'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import PurchaseReceipt from './PurchaseReceipt';
import { downloadReceipt } from '../../lib/downloadReceipt';
import { computeAdjustedItems } from '../../lib/orderAmounts'; // ← NEW

export default function ReceiptModal({
  isOpen,
  onClose,
  order: initialOrder,
  mode = 'customer',
  onAccept,
  accepting = false,
}) {
  const receiptRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);

  // 🔄 Fetch the FULL order when the modal opens
  useEffect(() => {
    if (!isOpen || !initialOrder?.id) return;
    setOrder(initialOrder);

    let cancelled = false;
    setLoading(true);

    fetch(`/api/orders/${initialOrder.id}/receipt`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success && d.order) setOrder(d.order);
        else console.warn('Receipt fetch returned no data:', d);
      })
      .catch((err) => console.error('Receipt fetch error:', err))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [isOpen, initialOrder?.id]);

  // 🧮 Bake service charge into item amounts so PurchaseReceipt can just render
  const displayOrder = useMemo(() => {
    if (!order) return order;
    const { items: adjustedItems, adjustedSubtotal } = computeAdjustedItems(order);
    return {
      ...order,
      items: adjustedItems,
      _adjustedSubtotal: adjustedSubtotal, // PurchaseReceipt reads this
    };
  }, [order]);

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    setDownloading(true);
    try {
      const filename = `GoldCentro-Receipt-${order?.id?.slice(-8) || 'order'}.pdf`;
      await downloadReceipt('purchase-receipt', filename);
      toast.success('Receipt downloaded');
    } catch (err) {
      toast.error('Download failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 22 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-3xl z-10">
            <div>
              <h2 className="text-xl font-bold">Purchase Receipt</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Order #{order.id.slice(-8)} • ₹
                {(order.finalPrice || order.agentOffer || 0).toFixed(2)}
                {loading && (
                  <span className="ml-2 text-blue-500">Refreshing…</span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
            <div className="bg-white shadow-md rounded-lg p-4">
              {/* ⬇ pass the adjusted order */}
              <PurchaseReceipt ref={receiptRef} order={displayOrder} />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap gap-3 sticky bottom-0 bg-white rounded-b-3xl">
            <button
              onClick={handleDownload}
              disabled={downloading || loading}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-5 py-3 rounded-xl transition disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
            <div className="flex-1" />
            {mode === 'customer' && onAccept && (
              <button
                onClick={onAccept}
                disabled={accepting}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50"
              >
                {accepting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Acknowledge & Accept
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}