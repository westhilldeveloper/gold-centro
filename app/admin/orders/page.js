'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../../lib/socket';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  CurrencyRupeeIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import CustomerDetailsModal from '../../components/CustomerDetailsModal';
import ImagePreview from '../../components/ImagePreview';

const PAYMENT_LABEL = {
  CASH: '💵 Cash',
  UPI: '📱 UPI',
  BANK_TRANSFER: '🏦 Bank',
  CHEQUE: '📝 Cheque',
};

export default function AdminOrdersPage() {
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

    useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;

    const controller = new AbortController();
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [ordersRes, agentsRes, approvalRes] = await Promise.all([
          fetch('/api/orders/pending', { credentials: 'include', signal: controller.signal }),
          fetch('/api/users/agents', { credentials: 'include', signal: controller.signal }),
          fetch('/api/orders/pending-approval', { credentials: 'include', signal: controller.signal }),
        ]);
        if (!ordersRes.ok) throw new Error('Failed to fetch orders');
        if (!agentsRes.ok) throw new Error('Failed to fetch agents');
        if (!approvalRes.ok) throw new Error('Failed to fetch approvals');
        const [ordersData, agentsData, approvalData] = await Promise.all([
          ordersRes.json(), agentsRes.json(), approvalRes.json(),
        ]);
        if (cancelled) return;
        if (ordersData.success) setPendingOrders(ordersData.orders);
        if (agentsData.success) setAgents(agentsData.agents);
        if (approvalData.success) setPendingApprovalOrders(approvalData.orders);
      } catch (err) {
        if (err.name === 'AbortError' || cancelled) return;
        setError(err.message);
        toast.error(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    const socket = getSocket();

    // 1. New Order Arrived
    const onNewOrder = (order) => {
      setPendingOrders((prev) =>
        prev.some((o) => o.id === order.id) ? prev : [order, ...prev]
      );
      toast.success('New order received!');
    };

    // 2. Any Order State Change (Assigned, Arrived, Offer Sent, etc.)
    const onOrderChanged = (updatedOrder) => {
      // Update Pending Orders (Ready to assign list)
      setPendingOrders((prev) => {
        // If the status is OTP_VERIFIED, it belongs here. Update or add it.
        if (updatedOrder.status === 'OTP_VERIFIED') {
          const exists = prev.some((o) => o.id === updatedOrder.id);
          return exists 
            ? prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)) 
            : [updatedOrder, ...prev];
        }
        // If it's any other status (e.g., AGENT_ASSIGNED), remove it from this list.
        return prev.filter((o) => o.id !== updatedOrder.id);
      });

      // Update Pending Approvals (Agent Offer list)
      setPendingApprovalOrders((prev) => {
        // Check if the status belongs in the approval tab
        // (Adjust 'PENDING_APPROVAL' to whatever status your DB uses when agent sends an offer)
        const isPendingApproval = ['PENDING_APPROVAL', 'AGENT_OFFER_SENT'].includes(updatedOrder.status);

        if (isPendingApproval) {
          const exists = prev.some((o) => o.id === updatedOrder.id);
          return exists
            ? prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
            : [updatedOrder, ...prev];
        }
        // If it's no longer pending approval, remove it.
        return prev.filter((o) => o.id !== updatedOrder.id);
      });
    };

    // 3. Attach Listeners
    socket.on('new-order', onNewOrder);
    socket.on('offer-updated', onOrderChanged);   // From admin-review & verify-agent
    socket.on('order-assigned', onOrderChanged);  // From assign route
    socket.on('order-updated', onOrderChanged);   // From other status changes

    // 4. Cleanup
    return () => {
      cancelled = true;
      controller.abort();
      socket.off('new-order', onNewOrder);
      socket.off('offer-updated', onOrderChanged);
      socket.off('order-assigned', onOrderChanged);
      socket.off('order-updated', onOrderChanged);
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
    if (!rate24k || !rate22k) {
      toast.error('Please enter both 24K and 22K rates');
      return;
    }
    try {
      const res = await fetch('/api/rates/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rate24k: parseFloat(rate24k),
          rate22k: parseFloat(rate22k),
          adminId: user.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to update rate');
      const data = await res.json();
      if (data.success) {
        toast.success('✅ Rate updated!');
        // const socket = getSocket();
        // socket.emit('rate-updated', data.rate);
        setRate24k('');
        setRate22k('');
      } else {
        toast.error('❌ ' + (data.error || 'Failed to update rate'));
      }
    } catch (err) {
      toast.error('❌ Error: ' + err.message);
    }
  };

  const assignAgent = async (orderId, agentId) => {
  if (!agentId) { toast.error('Please select an agent'); return; }
  setAssigning((prev) => ({ ...prev, [orderId]: true }));
  try {
    const res = await fetch('/api/orders/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orderId, agentId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Assignment failed');
    toast.success('✅ Agent assigned!');
    setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
    // ❌ REMOVED: socket.emit('agent-assigned', data.order)
  } catch (err) {
    toast.error('❌ ' + err.message);
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
      credentials: 'include',
      body: JSON.stringify({ orderId, action, offerPrice, comment }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed');
    toast.success(
      '✅ ' + (action === 'accept_agent_offer' ? 'Offer accepted!' : 'Proposal sent!')
    );
    // No refetch, no client emit. The server's `offer-updated` broadcast
    // will patch `pendingApprovalOrders` (including for this tab).
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
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CurrencyRupeeIcon className="w-5 h-5 text-yellow-600" />
            Set Buying Rate
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="number"
              placeholder="24K Rate (₹/gm)"
              value={rate24k}
              onChange={(e) => setRate24k(e.target.value)}
              className="border-2 border-gray-200 rounded-xl p-3 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition"
            />
            <input
              type="number"
              placeholder="22K Rate (₹/gm)"
              value={rate22k}
              onChange={(e) => setRate22k(e.target.value)}
              className="border-2 border-gray-200 rounded-xl p-3 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition"
            />
            <button
              onClick={updateRate}
              className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold p-3 rounded-xl shadow-lg hover:shadow-xl transition"
            >
              Publish Rate
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

          <Link
    href="/admin/orders/all"
    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
  >
    View all orders →
  </Link>
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

      {/* Customer Modal */}
      <CustomerDetailsModal
        isOpen={showCustomerModal}
        onClose={() => {
          setShowCustomerModal(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
      />

      {/* Full-page image preview */}
      <ImagePreview src={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}

// ============================================
// PledgeSection — READ-ONLY view of agent-recorded pledge info
// ============================================
function PledgeSection({ order, compact }) {
  if (!order.isPledged) return null;

  const hasBankInfo = !!(order.pledgeBankName || order.pledgeLoanAccountNo);
  const hasDeclaration = !!order.pledgeDeclarationUrl;

  return (
    <div
      className={`rounded-xl border bg-rose-50 border-rose-200 ${
        compact ? 'p-3' : 'p-4'
      } space-y-2`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">🔒</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-rose-800">
            Pledged gold — bank/NBFC release
          </p>
          {hasBankInfo ? (
            <p className="text-xs text-rose-600">
              {order.pledgeBankName || '—'} · A/c {order.pledgeLoanAccountNo || '—'} · ₹
              {Number(order.pledgeOutstandingAmount || 0).toLocaleString()}
            </p>
          ) : (
            <p className="text-xs text-amber-600 font-medium">
              Agent marked as pledged — bank details not yet provided
            </p>
          )}
        </div>
      </div>

      {/* Declaration status */}
      <div className="pt-1 border-t border-rose-200">
        {hasDeclaration ? (
          <a
            href={order.pledgeDeclarationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-700 hover:text-green-900 underline font-medium"
          >
            ✅ Signed declaration uploaded
            {order.pledgeDeclarationUploadedAt && (
              <span className="text-gray-500 ml-1">
                ({new Date(order.pledgeDeclarationUploadedAt).toLocaleDateString()})
              </span>
            )}
          </a>
        ) : (
          <span className="text-xs text-amber-600 font-medium">
            ⏳ Awaiting signed declaration from agent
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// OrderCard (assign agent view)
// ============================================
function OrderCard({ order, agents, assigning, onAssign, onView }) {
  const [selectedAgent, setSelectedAgent] = useState('');
  return (
    <div className="border rounded-xl p-4 bg-gray-50 hover:shadow-md transition-shadow space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm text-gray-500">
              #{order.id.slice(-8)}
            </span>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
              {order.status.replace('_', ' ')}
            </span>
            {order.isPledged && (
              <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full font-medium">
                🔒 Pledged
              </span>
            )}
            <span className="text-xs text-gray-400">
              {new Date(order.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="text-sm mt-1">
            <span className="text-gray-500">Customer:</span>{' '}
            {order.customer?.name || 'N/A'} ({order.customer?.phone})
          </p>
          <p className="text-sm">
            <span className="text-gray-500">Weight:</span> {order.weight}g (
            {order.purity}) &nbsp;|&nbsp;
            <span className="text-gray-500">Est. Total:</span> ₹
            {order.estimatedTotal?.toFixed(2)}
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

      {/* Pledge info — read-only, only shown if agent has flagged it */}
      <PledgeSection order={order} compact />
    </div>
  );
}

// ============================================
// ApprovalCard (with items + photos + pledge)
// ============================================
function ApprovalCard({
  order,
  approving,
  onApprove,
  onView,
  onPreviewImage,
}) {
  const [adminOfferInput, setAdminOfferInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [showProposeInput, setShowProposeInput] = useState(false);

  const items = order.items || [];
  const totalGross = items.reduce((s, it) => s + (it.grossWeight || 0), 0);
  const totalNet = items.reduce((s, it) => s + (it.netWeight || 0), 0);
  const totalCount = items.reduce((s, it) => s + (it.count || 0), 0);
  const totalStone = items.reduce((s, it) => s + (it.stoneWeight || 0), 0);
const totalDust = items.reduce((s, it) => s + (it.dustWeight || 0), 0);

  const declarationMissing = order.isPledged && !order.pledgeDeclarationUrl;

  return (
    <div className="border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 bg-gray-50">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm text-gray-600 font-semibold">
            #{order.id.slice(-8)}
          </span>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
            {order.status.replace('_', ' ')}
          </span>
          {order.isPledged && (
            <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full font-medium">
              🔒 Pledged
            </span>
          )}
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
          className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50"
        >
          <EyeIcon className="w-4 h-4" /> Customer
        </button>
      </div>

      {/* Customer + Agent */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Customer</p>
          <p className="font-medium">{order.customer?.name || 'N/A'}</p>
          <p className="text-xs text-gray-500">{order.customer?.phone}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Agent</p>
          <p className="font-medium">{order.agent?.name || 'N/A'}</p>
          <p className="text-xs text-gray-500">{order.agent?.phone}</p>
        </div>
      </div>

      {/* Pledge info — read-only */}
      {order.isPledged && (
        <div className="px-4 pb-2">
          <PledgeSection order={order} />
        </div>
      )}

      {/* Items Grid with photos */}
      {/* Items Grid with photos */}
<div className="px-4 pb-4 pt-2">
  <p className="text-sm font-semibold text-gray-700 mb-3">
    📦 Items ({items.length}) • {totalCount} pc
  </p>

  {items.length === 0 ? (
    <p className="text-gray-400 text-sm italic py-4 text-center bg-gray-50 rounded-lg">
      No items recorded
    </p>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((item, idx) => {
        // Normalize: prefer the array, fall back to a singular legacy field if present
        const images =
          Array.isArray(item.imageUrls) && item.imageUrls.length > 0
            ? item.imageUrls
            : item.imageUrl
            ? [item.imageUrl]
            : [];

        const gross = item.grossWeight || 0;
        const stone = item.stoneWeight || 0;
        const dust = item.dustWeight || 0;
        const net = item.netWeight || 0;

        return (
          <div
            key={item.id || idx}
            className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {item.name || 'Other'}
                  {item.purity && (
                    <span className="ml-1 text-xs text-gray-500 font-normal">
                      ({item.purity})
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Count: {item.count || 1}
                </p>
              </div>
            </div>

            {/* Weights grid — Gross / Stone / Dust / Net */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="bg-white rounded-lg py-1.5 border border-gray-100">
                <p className="text-[10px] text-gray-400 leading-tight">
                  Gross
                </p>
                <p className="text-xs font-semibold text-gray-800">
                  {gross.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg py-1.5 border border-gray-100">
                <p className="text-[10px] text-gray-400 leading-tight">
                  Stone
                </p>
                <p className="text-xs font-semibold text-gray-800">
                  {stone.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg py-1.5 border border-gray-100">
                <p className="text-[10px] text-gray-400 leading-tight">
                  Dust
                </p>
                <p className="text-xs font-semibold text-gray-800">
                  {dust.toFixed(2)}
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg py-1.5 border border-yellow-200">
                <p className="text-[10px] text-yellow-700 leading-tight font-medium">
                  Net
                </p>
                <p className="text-xs font-bold text-yellow-700">
                  {net.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Photos strip */}
            {images.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <button
                    key={url || i}
                    type="button"
                    onClick={() => onPreviewImage(url)}
                    className="w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-yellow-400 transition bg-white flex-shrink-0"
                    title="Click to enlarge"
                  >
                    <img
                      src={url}
                      alt={`${item.name || 'item'}-${i}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-gray-400 italic">
                <PhotoIcon className="w-4 h-4" />
                No photos
              </div>
            )}
          </div>
        );
      })}
    </div>
  )}

  {/* Totals — now includes stone + dust */}
  {items.length > 0 && (
    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-500">Gross</span>
        <span className="font-semibold text-sm">
          {totalGross.toFixed(2)}g
        </span>
      </div>
      <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-500">Stone</span>
        <span className="font-semibold text-sm">
          {totalStone.toFixed(2)}g
        </span>
      </div>
      <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-500">Dust</span>
        <span className="font-semibold text-sm">
          {totalDust.toFixed(2)}g
        </span>
      </div>
      <div className="bg-yellow-50 rounded-lg p-2.5 border border-yellow-200 flex justify-between items-center">
        <span className="text-xs text-yellow-700 font-medium">Net</span>
        <span className="font-bold text-sm text-yellow-700">
          {totalNet.toFixed(2)}g
        </span>
      </div>
    </div>
  )}
</div>

      {/* Offers */}
      <div className="px-4 pb-3 flex flex-wrap gap-3 text-sm">
        {order.agentOffer && (
          <div className="bg-blue-50 rounded-lg px-3 py-2 flex-1 min-w-[150px]">
            <p className="text-xs text-blue-600">Agent Offer</p>
            <p className="font-bold text-blue-700">
              ₹{order.agentOffer.toFixed(2)}
            </p>
          </div>
        )}
        {order.adminOffer && (
          <div className="bg-orange-50 rounded-lg px-3 py-2 flex-1 min-w-[150px]">
            <p className="text-xs text-orange-600">Your Offer</p>
            <p className="font-bold text-orange-700">
              ₹{order.adminOffer.toFixed(2)}
            </p>
          </div>
        )}
        {order.estimatedTotal && !order.agentOffer && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 flex-1 min-w-[150px]">
            <p className="text-xs text-gray-500">Estimated</p>
            <p className="font-bold text-gray-700">
              ₹{order.estimatedTotal.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {order.comment && (
        <div className="mx-4 mb-3 bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600">
          💬 {order.comment}
        </div>
      )}

      {declarationMissing && (
        <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
          ⚠️ Signed pledge declaration is required before accepting this offer.
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 flex flex-wrap items-center gap-2 justify-end">
        {!showProposeInput ? (
          <>
            <button
              onClick={() => onApprove(order.id, 'accept_agent_offer')}
              disabled={
                !!approving[order.id] || !order.agentOffer || declarationMissing
              }
              title={
                declarationMissing
                  ? 'Signed pledge declaration required first'
                  : ''
              }
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {approving[order.id] ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <CheckCircleIcon className="w-4 h-4" />
              )}
              Accept Agent
            </button>
            <button
              onClick={() => setShowProposeInput(true)}
              disabled={declarationMissing}
              title={
                declarationMissing
                  ? 'Signed pledge declaration required first'
                  : ''
              }
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Propose
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
                onApprove(
                  order.id,
                  'propose_offer',
                  parseFloat(adminOfferInput),
                  commentInput
                );
                setShowProposeInput(false);
                setAdminOfferInput('');
                setCommentInput('');
              }}
              disabled={!!approving[order.id]}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm transition"
            >
              {approving[order.id] ? '⏳' : 'Send'}
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
  );
}