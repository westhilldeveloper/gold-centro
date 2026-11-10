'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../../lib/socket';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  CurrencyRupeeIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import CustomerDetailsModal from '../components/CustomerDetailsModal';

const PAYMENT_LABEL = {
  CASH: '💵 Cash',
  UPI: '📱 UPI',
  BANK_TRANSFER: '🏦 Bank',
  CHEQUE: '📝 Cheque',
};

export default function AdminPage() {
  const { user } = useAuth();
  const [pendingOrders, setPendingOrders] = useState([]);
  const [pendingApprovalOrders, setPendingApprovalOrders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [rate24k, setRate24k] = useState('');
  const [rate22k, setRate22k] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('orders');

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [assigning, setAssigning] = useState({});
  const [approving, setApproving] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [rateInputs, setRateInputs] = useState({ '24K': '', '22K': '', '18K': '' });
  const [serviceCharge, setServiceCharge] = useState('');
  
  
  const addKarat = () => {
  const name = prompt('Enter karat label (e.g., 20K):');
  if (!name || rateInputs[name] !== undefined) return;
  setRateInputs((prev) => ({ ...prev, [name]: '' }));
};

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [ordersRes, agentsRes, approvalRes] = await Promise.all([
          fetch('/api/orders/pending'),
          fetch('/api/users/agents'),
          fetch('/api/orders/pending-approval'),
        ]);

        if (!ordersRes.ok) throw new Error('Failed to fetch orders');
        if (!agentsRes.ok) throw new Error('Failed to fetch agents');
        if (!approvalRes.ok) throw new Error('Failed to fetch approvals');

        const ordersData = await ordersRes.json();
        const agentsData = await agentsRes.json();
        const approvalData = await approvalRes.json();

        if (ordersData.success) setPendingOrders(ordersData.orders);
        if (agentsData.success) setAgents(agentsData.agents);
        if (approvalData.success) setPendingApprovalOrders(approvalData.orders);
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const socket = getSocket();

    // 1. Define named listener functions
    const onNewOrder = (newOrder) => {
      setPendingOrders((prev) => {
        // Deduplicate in case it already exists
        if (prev.some(o => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
      toast.success('New order received!');
    };

     const onOrderStateChanged = (updatedOrder) => {
      // If an order is updated, it's likely no longer in the "Pending Assignment" list
      setPendingOrders((prev) => prev.filter((o) => o.id !== updatedOrder.id));

      // Update the Pending Approvals list
      setPendingApprovalOrders((prev) => {
        // If it's no longer pending approval, remove it
        if (updatedOrder.status !== 'PENDING_APPROVAL') {
          return prev.filter((o) => o.id !== updatedOrder.id);
        }
        // If it's new to the list, add it
        if (!prev.some((o) => o.id === updatedOrder.id)) {
          return [updatedOrder, ...prev];
        }
        // If it exists, update it
        return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
      });
    };
    

    socket.on('new-order', onNewOrder);
    socket.on('offer-updated', onOrderStateChanged);
    socket.on('order-assigned', onOrderStateChanged); 
    socket.on('order-updated', onOrderStateChanged); 

    return () => {
       socket.off('new-order', onNewOrder);
      socket.off('offer-updated', onOrderStateChanged);
      socket.off('order-assigned', onOrderStateChanged);
      socket.off('order-updated', onOrderStateChanged);
    };
  }, [user]);

  const filteredOrders = useMemo(() => {
    let filtered = [...pendingOrders];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(term) ||
          order.customer?.name?.toLowerCase().includes(term) ||
          order.customer?.phone?.includes(term)
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter((order) => new Date(order.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((order) => new Date(order.createdAt) <= to);
    }
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'highest':
        filtered.sort((a, b) => (b.estimatedTotal || 0) - (a.estimatedTotal || 0));
        break;
      case 'lowest':
        filtered.sort((a, b) => (a.estimatedTotal || 0) - (b.estimatedTotal || 0));
        break;
      default:
        break;
    }
    return filtered;
  }, [pendingOrders, searchTerm, dateFrom, dateTo, sortBy]);

  const updateRate = async () => {
  const cleaned = {};
  Object.entries(rateInputs).forEach(([k, v]) => {
    const num = parseFloat(v);
    if (!isNaN(num) && num > 0) cleaned[k] = num;
  });

  if (Object.keys(cleaned).length === 0) {
    toast.error('Enter at least one rate');
    return;
  }

  try {
    const res = await fetch('/api/rates/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rates: cleaned,
        serviceChargePercent: parseFloat(serviceCharge) || 0,
        adminId: user.id,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    toast.success('✅ Rates published');
    // const socket = getSocket();
    // socket.emit('rate-updated', data.rate);
  } catch (err) {
    toast.error('❌ ' + err.message);
  }
};

  const assignAgent = async (orderId, agentId) => {
    if (!agentId) {
      toast.error('Please select an agent');
      return; 
    }
    setAssigning((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch('/api/orders/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, agentId }),
      });
      if (!res.ok) throw new Error('Failed to assign');
      const data = await res.json();
      if (data.success) {
        toast.success('✅ Agent assigned!');
        setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
        // const socket = getSocket();
        // socket.emit('agent-assigned', data.order);
      } else {
        toast.error('❌ ' + (data.error || 'Assignment failed'));
      }
    } catch (err) {
      toast.error('❌ Error: ' + err.message);
    } finally {
      setAssigning((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleAdminReview = async (orderId, action, offerPrice, comment) => {
    setApproving((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch('/api/orders/admin-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, adminId: user.id, action, offerPrice, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(
        '✅ ' + (action === 'accept_agent_offer' ? 'Offer accepted!' : 'Proposal sent!')
      );
      // setPendingApprovalOrders((prev) => prev.filter((o) => o.id !== orderId));
      // const refresh = await fetch('/api/orders/pending-approval');
      // const refreshData = await refresh.json();
      // if (refreshData.success) setPendingApprovalOrders(refreshData.orders);
      // const socket = getSocket();
      // socket.emit('offer-updated', data.order);
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setApproving((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const viewCustomer = async (customerId) => {
    try {
      const res = await fetch(`/api/user/details?userId=${customerId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch customer details');
      setSelectedCustomer(data.user);
      setShowCustomerModal(true);
    } catch (err) {
      toast.error('❌ ' + err.message);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <Toaster position="top-center" />
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>

        {/* Rate Update */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
        >
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-lg font-semibold flex items-center gap-2">
      <CurrencyRupeeIcon className="w-5 h-5 text-yellow-600" />
      Today's Gold Buying Rates
    </h2>
    <button
      onClick={addKarat}
      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
    >
      + Add Karat
    </button>
  </div>

  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
    {Object.entries(rateInputs).map(([karat, value]) => (
      <div key={karat} className="relative">
        <label className="block text-xs text-gray-500 mb-1">{karat}</label>
        <input
          type="number"
          placeholder={`${karat} ₹/gm`}
          value={value}
          onChange={(e) =>
            setRateInputs((prev) => ({ ...prev, [karat]: e.target.value }))
          }
          className="w-full border-2 border-gray-200 rounded-xl p-2.5 text-sm focus:border-yellow-500 outline-none"
        />
        {!['24K', '22K'].includes(karat) && (
          <button
            onClick={() =>
              setRateInputs((prev) => {
                const next = { ...prev };
                delete next[karat];
                return next;
              })
            }
            className="absolute top-0 right-0 text-red-400 hover:text-red-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>
    ))}
  </div>

  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Service Charge (%)
    </label>
    <input
      type="number"
      step="0.01"
      value={serviceCharge}
      onChange={(e) => setServiceCharge(e.target.value)}
      placeholder="e.g. 2.5"
      className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-yellow-500 outline-none"
    />
    <p className="text-[11px] text-gray-500 mt-1">
      Deducted from the total net value before presenting the offer.
    </p>
  </div>

  <button
    onClick={updateRate}
    className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold p-3 rounded-xl shadow-lg hover:shadow-xl transition"
  >
    Publish Rates
  </button>
</div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'orders'
                ? 'text-yellow-600 border-b-2 border-yellow-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Orders ({pendingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'approvals'
                ? 'text-yellow-600 border-b-2 border-yellow-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Approvals ({pendingApprovalOrders.length})
          </button>
        </div>

        {activeTab === 'orders' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FunnelIcon className="w-5 h-5 text-gray-600" />
                Pending Orders ({filteredOrders.length})
              </h2>
              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition w-full md:w-48"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-yellow-500 outline-none"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="highest">Highest value</option>
                  <option value="lowest">Lowest value</option>
                </select>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-yellow-500 outline-none text-sm"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-yellow-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No pending orders matching criteria.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    agents={agents}
                    assigning={assigning}
                    onAssign={assignAgent}
                    onView={viewCustomer}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'approvals' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
          >
            <h2 className="text-lg font-semibold mb-4">Pending Approval</h2>
            {pendingApprovalOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No orders pending approval.</p>
            ) : (
              <div className="space-y-4">
                {pendingApprovalOrders.map((order) => (
                  <ApprovalCard
                    key={order.id}
                    order={order}
                    approving={approving}
                    onApprove={handleAdminReview}
                    onView={viewCustomer}
                    onPreviewImage={setPreviewImage}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      <CustomerDetailsModal
        isOpen={showCustomerModal}
        onClose={() => {
          setShowCustomerModal(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
      />

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-3xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-yellow-400 transition"
              >
                <XMarkIcon className="w-8 h-8" />
              </button>
              <img
                src={previewImage}
                alt="Preview"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================
// Order Card (assign agent view)
// ============================
function OrderCard({ order, agents, assigning, onAssign, onView }) {
  const [selectedAgent, setSelectedAgent] = useState('');
  return (
    <div className="border rounded-xl p-4 bg-gray-50 hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm text-gray-500">#{order.id.slice(-8)}</span>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
              {order.status.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(order.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="text-sm mt-1">
            <span className="text-gray-500">Customer:</span> {order.customer?.name || 'N/A'} (
            {order.customer?.phone})
          </p>
          <p className="text-sm">
            <span className="text-gray-500">Weight:</span> {order.weight}g ({order.purity}) &nbsp;|&nbsp;
            <span className="text-gray-500">Est. Total:</span> ₹{order.estimatedTotal?.toFixed(2)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onView(order.customerId)}
            className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50 transition"
          >
            <EyeIcon className="w-4 h-4" /> View
          </button>
          <div className="flex items-center gap-2">
            <select
              className="border rounded-lg p-2 text-sm"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              disabled={!!assigning[order.id]}
            >
              <option value="">Select Agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.phone})
                </option>
              ))}
            </select>
            <button
              onClick={() => onAssign(order.id, selectedAgent)}
              disabled={!selectedAgent || !!assigning[order.id]}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {assigning[order.id] ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Assigning...
                </>
              ) : (
                'Assign'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================
// Approval Card (with full item details)
// ============================
function ApprovalCard({ order, approving, onApprove, onView, onPreviewImage }) {
  const [adminOfferInput, setAdminOfferInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [showProposeInput, setShowProposeInput] = useState(false);
  

  // Totals
  const totalGross = order.items?.reduce((s, it) => s + (it.grossWeight || 0), 0) || 0;
  const totalStone = order.items?.reduce((s, it) => s + (it.stoneWeight || 0), 0) || 0;
  const totalDust = order.items?.reduce((s, it) => s + (it.dustWeight || 0), 0) || 0;
  const totalNet = order.items?.reduce((s, it) => s + (it.netWeight || 0), 0) || 0;
  const totalCount = order.items?.reduce((s, it) => s + (it.count || 0), 0) || 0;
  
  return (
    <div className="border rounded-xl bg-gray-50 hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 bg-white">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-sm text-gray-500">#{order.id.slice(-8)}</span>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
            {order.status.replace('_', ' ')}
          </span>
          {order.paymentMode && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
              {PAYMENT_LABEL[order.paymentMode] || order.paymentMode}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {new Date(order.createdAt).toLocaleString()}
          </span>
        </div>
        <button
          onClick={() => onView(order.customerId)}
          className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50 transition"
        >
          <EyeIcon className="w-4 h-4" /> Customer
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Customer + Agent row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Customer</p>
            <p className="font-medium">{order.customer?.name || 'N/A'}</p>
            <p className="text-xs text-gray-500">{order.customer?.phone}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Agent</p>
            <p className="font-medium">{order.agent?.name || 'N/A'}</p>
            <p className="text-xs text-gray-500">{order.agent?.phone}</p>
          </div>
        </div>

        {/* Items list with images */}
        {order.items && order.items.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              📦 Items ({order.items.length}) • {totalCount} pc(s)
            </p>
            <div className="space-y-2">
              {order.items.map((item, idx) => {
  const images = item.imageUrls?.length
    ? item.imageUrls
    : item.imageUrl
    ? [item.imageUrl]
    : [];

    

  return (
    <div
      key={item.id || idx}
      className="bg-white rounded-lg p-3 border border-gray-100 space-y-2"
    >
      {/* Row 1: Name, count, purity, category */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
        <p className="font-medium text-gray-900">{item.name}</p>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          ×{item.count}
        </span>
        {item.purity && (
          <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">
            {item.purity}
          </span>
        )}
        {item.order?.purity && !item.purity && (
          <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">
            {item.order.purity}
          </span>
        )}
      </div>

      {/* Row 2: Weight breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-gray-50 rounded-md px-2 py-1">
          <p className="text-gray-400 text-[10px]">Gross</p>
          <p className="font-semibold text-gray-800">
            {item.grossWeight?.toFixed(2) || '0.00'} g
          </p>
        </div>
        <div className="bg-gray-50 rounded-md px-2 py-1">
          <p className="text-gray-400 text-[10px]">Stone</p>
          <p className="font-semibold text-gray-800">
            {item.stoneWeight?.toFixed(2) || '0.00'} g
          </p>
        </div>
        <div className="bg-gray-50 rounded-md px-2 py-1">
          <p className="text-gray-400 text-[10px]">Dust</p>
          <p className="font-semibold text-gray-800">
            {item.dustWeight?.toFixed(2) || '0.00'} g
          </p>
        </div>
        <div className="bg-yellow-50 rounded-md px-2 py-1 border border-yellow-200">
          <p className="text-yellow-700 text-[10px]">Net</p>
          <p className="font-bold text-yellow-700">
            {item.netWeight?.toFixed(2) || '0.00'} g
          </p>
        </div>
      </div>

      {/* Row 3: Images */}
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => onPreviewImage(url)}
              className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-yellow-400 transition"
            >
              <img
                src={url}
                alt={`${item.name}-${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="w-20 h-20 rounded-lg bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center">
          <PhotoIcon className="w-6 h-6 text-gray-300" />
        </div>
      )}
    </div>
  );
})}
            </div>

            {/* Totals */}
            {/* Totals */}
<div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
  <div className="bg-white rounded-lg p-2 border border-gray-100 flex justify-between">
    <span className="text-gray-500 text-xs">Total Gross</span>
    <span className="font-semibold">{totalGross.toFixed(2)}g</span>
  </div>
  <div className="bg-white rounded-lg p-2 border border-gray-100 flex justify-between">
    <span className="text-gray-500 text-xs">Total Stone</span>
    <span className="font-semibold">{totalStone.toFixed(2)}g</span>
  </div>
  <div className="bg-white rounded-lg p-2 border border-gray-100 flex justify-between">
    <span className="text-gray-500 text-xs">Total Dust</span>
    <span className="font-semibold">{totalDust.toFixed(2)}g</span>
  </div>
  <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-200 flex justify-between">
    <span className="text-yellow-700 text-xs font-medium">Total Net</span>
    <span className="font-bold text-yellow-700">{totalNet.toFixed(2)}g</span>
  </div>
</div>
          </div>
        )}

        {/* Offers */}
        {/* Offers & Details */}
<div className="bg-white rounded-lg p-3 border border-gray-100 space-y-2 text-sm">
  {order.agentOffer && (
    <div className="flex justify-between">
      <span className="text-gray-500">Agent Offer</span>
      <span className="font-semibold text-blue-600">
        ₹{order.agentOffer.toFixed(2)}
      </span>
    </div>
  )}
  {order.adminOffer && (
    <div className="flex justify-between">
      <span className="text-gray-500">Your Offer</span>
      <span className="font-semibold text-orange-600">
        ₹{order.adminOffer.toFixed(2)}
      </span>
    </div>
  )}
  {order.estimatedTotal && !order.agentOffer && (
    <div className="flex justify-between">
      <span className="text-gray-500">Estimated</span>
      <span className="font-semibold">₹{order.estimatedTotal.toFixed(2)}</span>
    </div>
  )}

  {/* Address block */}
  {order.customerLat && order.customerLng && (
    <div className="pt-2 border-t border-gray-100 text-xs text-gray-600">
      <span className="text-gray-400">Location:</span>{' '}
      <a
        href={`https://www.google.com/maps?q=${order.customerLat},${order.customerLng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline"
      >
        {order.customerLat.toFixed(4)}, {order.customerLng.toFixed(4)}
      </a>
    </div>
  )}
</div>

        {order.comment && (
          <p className="text-xs text-gray-500 bg-white rounded-lg p-2 border border-gray-100">
            💬 {order.comment}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {!showProposeInput ? (
            <>
              <button
                onClick={() => onApprove(order.id, 'accept_agent_offer')}
                disabled={!!approving[order.id] || !order.agentOffer}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition disabled:opacity-50 flex items-center gap-1"
              >
                {approving[order.id] ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <CheckCircleIcon className="w-4 h-4" />
                )}
                Accept Agent Offer
              </button>
              <button
                onClick={() => setShowProposeInput(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                Propose Counter
              </button>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200 w-full">
              <input
                type="number"
                placeholder="Offer price"
                value={adminOfferInput}
                onChange={(e) => setAdminOfferInput(e.target.value)}
                className="flex-1 min-w-[120px] border rounded px-2 py-1.5 text-sm focus:border-orange-500 outline-none"
              />
              <input
                type="text"
                placeholder="Comment (optional)"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="flex-1 min-w-[120px] border rounded px-2 py-1.5 text-sm focus:border-orange-500 outline-none"
              />
              <button
                onClick={() => {
                  if (!adminOfferInput) {
                    toast.error('Enter an offer price');
                    return;
                  }
                  onApprove(order.id, 'propose_offer', parseFloat(adminOfferInput), commentInput);
                  setShowProposeInput(false);
                  setAdminOfferInput('');
                  setCommentInput('');
                }}
                disabled={!!approving[order.id]}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm transition flex items-center gap-1"
              >
                {approving[order.id] ? <span className="animate-spin">⏳</span> : 'Send'}
              </button>
              <button
                onClick={() => {
                  setShowProposeInput(false);
                  setAdminOfferInput('');
                  setCommentInput('');
                }}
                className="text-gray-400 hover:text-gray-600 text-sm px-2"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}