// D:\gold-centro\app\api\orders\my-orders\route.js
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { getSocket } from '../../lib/socket';
import ReceiptModal from '../components/ReceiptModal';
import {
  ClipboardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export default function OrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [pendingAcceptance, setPendingAcceptance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState({});
  const [receiptOrder, setReceiptOrder] = useState(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        const [allRes, pendingRes] = await Promise.all([
          fetch(`/api/orders/my-orders?userId=${user.id}`),
          fetch(`/api/orders/ready-for-customer?customerId=${user.id}`),
        ]);

        if (!allRes.ok) throw new Error('Failed to fetch orders');
        if (!pendingRes.ok) throw new Error('Failed to fetch pending orders');

        const allData = await allRes.json();
        const pendingData = await pendingRes.json();

        if (allData.success) setOrders(allData.orders);
        if (pendingData.success) setPendingAcceptance(pendingData.orders);
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, router]);

  useEffect(() => {
  if (!user?.id) return;

  const socket = getSocket();

  // Join customer's personal room
  const joinCustomerRoom = () => {
    socket.emit('join-room', `customer:${user.id}`);
    console.log(`📥 Customer joined room: customer:${user.id}`);
  };

  if (socket.connected) joinCustomerRoom();
  socket.on('connect', joinCustomerRoom);

  // 🔥 Single event that updates both lists
  socket.on('order-updated', (updatedOrder) => {
    console.log('🔔 order-updated received:', updatedOrder.id, updatedOrder.status);

    // Update or insert into the full orders list
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === updatedOrder.id);
      return exists
        ? prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
        : [updatedOrder, ...prev];
    });

    // Route it into / out of the "Pending Your Decision" section
    if (updatedOrder.status === 'CUSTOMER_PENDING_ACCEPTANCE') {
      setPendingAcceptance((prev) => {
        const exists = prev.some((o) => o.id === updatedOrder.id);
        return exists
          ? prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
          : [updatedOrder, ...prev];
      });
      toast.success('📨 New offer received! Check your pending decisions.');
    } else {
      // No longer pending → remove from pending list
      setPendingAcceptance((prev) => prev.filter((o) => o.id !== updatedOrder.id));
    }
  });

  return () => {
    socket.off('connect', joinCustomerRoom);
    socket.off('order-updated');
  };
}, [user]);

  const handleCustomerDecision = async (orderId, action, comment) => {
  setAccepting((prev) => ({ ...prev, [orderId]: true }));
  try {
    const res = await fetch('/api/orders/customer-accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, customerId: user.id, action, comment }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    toast.success(action === 'accept' ? '✅ You accepted the offer!' : '❌ You rejected the offer.');

    setPendingAcceptance((prev) => prev.filter((o) => o.id !== orderId));
    setReceiptOrder(null);            // ✅ close modal

    const refresh = await fetch(`/api/orders/my-orders?userId=${user.id}`);
    const refreshData = await refresh.json();
    if (refreshData.success) setOrders(refreshData.orders);
  } catch (err) {
    toast.error('❌ ' + err.message);
  } finally {
    setAccepting((prev) => ({ ...prev, [orderId]: false }));
  }
};

  if (!user) return null;
  if (loading) return <div className="min-h-screen p-6 text-center text-gray-500">Loading orders...</div>;
  if (error) return <div className="min-h-screen p-6 text-red-500">{error}</div>;

  const statusColors = {
    DRAFT: 'bg-gray-200 text-gray-700',
    OTP_VERIFIED: 'bg-blue-100 text-blue-700',
    AGENT_ASSIGNED: 'bg-yellow-100 text-yellow-700',
    AGENT_ARRIVED: 'bg-indigo-100 text-indigo-700',
    AGENT_OFFER_SENT: 'bg-purple-100 text-purple-700',
    ADMIN_OFFER_SENT: 'bg-orange-100 text-orange-700',
    NEGOTIATING: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-green-100 text-green-700',
    REJECTED_BY_CUSTOMER: 'bg-red-100 text-red-700',
    DEAL_CLOSED: 'bg-gray-100 text-gray-700',
  };
  const defaultStatusColor = 'bg-gray-200 text-gray-700';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-black mb-6">My Orders</h1>

        {/* Pending Acceptance Section */}
        {pendingAcceptance.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-indigo-700 mb-3 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 animate-pulse" />
              Pending Your Decision
            </h2>
            <div className="space-y-4">
              {pendingAcceptance.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-indigo-500">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div>
                      <p className="font-mono text-sm text-gray-500">#{order.id.slice(-8)}</p>
                      <p className="text-sm text-gray-500">Agent: {order.agent?.name || 'N/A'}</p>
                      <p className="text-sm">Weight: {order.weight}g ({order.purity})</p>
                      <p className="text-lg font-bold text-green-600 mt-1">
                        Final Price: ₹{order.finalPrice?.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
  <button
    onClick={() => setReceiptOrder(order)}
    className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-6 py-2 rounded-xl font-semibold transition flex items-center gap-1"
  >
    📄 View Receipt & Accept
  </button>
  <button
    onClick={() => {
      const reason = prompt('Why are you rejecting this offer? (optional)');
      handleCustomerDecision(order.id, 'reject', reason || 'Customer rejected');
    }}
    disabled={!!accepting[order.id]}
    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl font-semibold transition disabled:opacity-50 flex items-center gap-1"
  >
    <XCircleIcon className="w-5 h-5" />
    Reject
  </button>
</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Orders */}
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Order History</h2>
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">
            No orders found. <br />
            <a href="/" className="text-yellow-600 underline hover:text-yellow-700">
              Sell your gold now
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const qrData = JSON.stringify({ orderId: order.id, secret: order.qrSecret });
              const statusLabel = order.status.replace('_', ' ').toLowerCase();

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-2 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-600 font-semibold">
                        #{order.id.slice(-8)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[order.status] || defaultStatusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* QR Code — Focused Section */}
                  <div className="flex flex-col items-center justify-center py-8 bg-gradient-to-b from-yellow-50/60 to-white">
                    {order.qrSecret ? (
                      <>
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                          className="bg-white p-5 rounded-2xl shadow-lg border-2 border-yellow-200 hover:border-yellow-400 transition-colors"
                        >
                          <QRCode
                            value={qrData}
                            size={200}
                            level="H"
                            includeMargin={false}
                          />
                        </motion.div>
                        <p className="text-xs text-gray-500 mt-4 font-medium tracking-wide">
                          📱 Show this QR to the agent for verification
                        </p>
                      </>
                    ) : (
                      <div className="w-48 h-48 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-sm">
                        No QR available
                      </div>
                    )}
                  </div>

                  {/* Order Details */}
                  <div className="px-6 pb-6">
                    <div className="grid grid-cols-2 gap-y-2 text-sm max-w-md mx-auto">
                      <span className="text-gray-500">Weight:</span>
                      <span className="font-medium text-right">{order.weight}g</span>

                      <span className="text-gray-500">Purity:</span>
                      <span className="font-medium text-right">{order.purity}</span>

                      <span className="text-gray-500">Estimated:</span>
                      <span className="font-medium text-right">₹{order.estimatedTotal?.toFixed(2)}</span>

                      {order.finalPrice && (
                        <>
                          <span className="text-gray-500">Final Price:</span>
                          <span className="font-semibold text-green-600 text-right">
                            ₹{order.finalPrice.toFixed(2)}
                          </span>
                        </>
                      )}

                      {order.agent && (
                        <>
                          <span className="text-gray-500">Agent:</span>
                          <span className="font-medium text-right">
                            {order.agent.name}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Actions & Badges */}
                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(order.id);
                          toast.success('Order ID copied!');
                        }}
                        className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                      >
                        <ClipboardIcon className="w-4 h-4" /> Copy ID
                      </button>

                      {['CUSTOMER_PENDING_ACCEPTANCE', 'COMPLETED'].includes(order.status) && (
  <button
    onClick={() => setReceiptOrder(order)}
    className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
  >
    📄 View Receipt
  </button>
)}

                      {order.status === 'OTP_VERIFIED' && (
                        <span className="text-xs text-yellow-600 flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" /> Awaiting agent assignment
                        </span>
                      )}
                      {order.status === 'COMPLETED' && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircleIcon className="w-4 h-4" /> Completed
                        </span>
                      )}
                      {order.status === 'REJECTED_BY_CUSTOMER' && (
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          <XCircleIcon className="w-4 h-4" /> Rejected by you
                        </span>
                      )}
                      {order.status === 'DEAL_CLOSED' && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <XCircleIcon className="w-4 h-4" /> Deal closed
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <ReceiptModal
  isOpen={!!receiptOrder}
  onClose={() => setReceiptOrder(null)}
  order={receiptOrder}
  mode="customer"
  accepting={receiptOrder ? !!accepting[receiptOrder.id] : false}
  onAccept={() => {
    if (receiptOrder) handleCustomerDecision(receiptOrder.id, 'accept');
  }}
/>
      <Toaster position="top-center" />
    </div>
  );
}