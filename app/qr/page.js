'use client';

import { useState, useEffect } from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

export default function QRPage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('goldOrder');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const age = Date.now() - data.timestamp;
        if (age < 24 * 60 * 60 * 1000) {
          setOrderData(data);
        } else {
          localStorage.removeItem('goldOrder');
          toast.error('Order expired (24h). Please place a new order.');
          router.push('/');
        }
      } catch (e) {
        toast.error('Invalid order data');
        router.push('/');
      }
    } else {
      toast.error('No active order found');
      router.push('/');
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!orderData) {
    return <div className="p-8 text-center text-red-500">No order found</div>;
  }

  const qrData = JSON.stringify({
    orderId: orderData.orderId,
    secret: orderData.qrSecret,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 p-6 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center"
      >
        <h1 className="text-2xl font-bold text-black mb-1">Your QR Code</h1>
        <p className="text-sm text-gray-500 mb-4">
          Order #{orderData.orderId.slice(-8)}
        </p>
        <div className="bg-white p-4 rounded-2xl shadow-xl border-2 border-yellow-300 inline-block mx-auto">
          <QRCode
            value={qrData}
            size={220}
            level="H"
            includeMargin
            className="rounded-lg"
          />
        </div>
        <p className="text-xs text-gray-500 mt-4">
          📱 Show this to your agent for verification. <br />
          Valid for 24 hours from order placement.
        </p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(orderData.orderId);
            toast.success('Order ID copied!');
          }}
          className="mt-3 text-sm text-blue-500 underline hover:text-blue-700"
        >
          Copy Order ID
        </button>
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={() => router.push('/')}
            className="bg-gray-200 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-300 transition"
          >
            Back to Home
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('goldOrder');
              toast.success('Order cleared');
              router.push('/');
            }}
            className="bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-red-200 transition"
          >
            Clear Order
          </button>
        </div>
      </motion.div>
      <Toaster position="top-center" />
    </div>
  );
}