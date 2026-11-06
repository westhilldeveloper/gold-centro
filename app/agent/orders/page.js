'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../../lib/socket';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import OfferForm from '../../components/OfferForm';
import ReceiptModal from '../../components/ReceiptModal';
import PostEstimationDocument from '../../components/PostEstimationDocument';
import { downloadPostEstimation } from '../../../lib/downloadPostEstimation';
import {
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyRupeeIcon,
  CalendarIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

const QrScanner = dynamic(() => import('../../components/QRScanner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black text-white text-sm">
      Loading camera...
    </div>
  ),
});

export default function AgentOrdersPage() {
  const { user } = useAuth();
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanningOrderId, setScanningOrderId] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [sendingOffer, setSendingOffer] = useState({});
  const [responding, setResponding] = useState({});
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [uploadingSigned, setUploadingSigned] = useState({});
  const [uploadingPledge, setUploadingPledge] = useState({});

  // Post-Estimation PDF generation
  // shape: { order, forcePledged } | null
  const [postEstimationOrder, setPostEstimationOrder] = useState(null);
  const [downloadingPostEstimation, setDownloadingPostEstimation] = useState({});
  const postEstimationRef = useRef(null);

  // ---- Fetch + socket ----
  useEffect(() => {
  if (!user?.id) return;

  const controller = new AbortController();
  let cancelled = false;

  const fetchOrders = async () => {
    try {
      const res = await fetch(
        `/api/orders/assigned?agentId=${user.id}`,
        { credentials: 'include', signal: controller.signal }
      );
      const data = await res.json();
      if (data.success && !cancelled) setAssignedOrders(data.orders);
    } catch (err) {
      if (err.name === 'AbortError' || cancelled) return;
      toast.error(err.message);
    } finally {
      if (!cancelled) setLoading(false);
    }
  };

  fetchOrders();

  const socket = getSocket();

  // No join-room needed — server puts us in `user:${JWT.sub}` on connect
  const onNewAssignment = (order) => {
    setAssignedOrders((prev) =>
      prev.some((o) => o.id === order.id) ? prev : [order, ...prev]
    );
    toast.success('📦 New order assigned!');
  };

  const onOfferUpdated = (updatedOrder) => {
    setAssignedOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
    toast('Admin responded to your offer.');
  };

  const onOrderUpdated = (updatedOrder) => {
    setAssignedOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
    );
  };

  socket.on('new-assignment', onNewAssignment);
  socket.on('offer-updated', onOfferUpdated);
  socket.on('order-updated', onOrderUpdated);

  return () => {
    cancelled = true;
    controller.abort();
    socket.off('new-assignment', onNewAssignment);
    socket.off('offer-updated', onOfferUpdated);
    socket.off('order-updated', onOrderUpdated);
  };
}, [user]);

  // ---- Download Post-Estimation as soon as hidden doc mounts ----
  useEffect(() => {
    if (!postEstimationOrder) return;

    const orderId = postEstimationOrder.order.id;
    const pledged = !!postEstimationOrder.forcePledged;
    let cancelled = false;

    const run = async () => {
      await new Promise((r) => requestAnimationFrame(r));
      if (cancelled || !postEstimationRef.current) return;

      setDownloadingPostEstimation((p) => ({ ...p, [orderId]: true }));
      try {
        await downloadPostEstimation(postEstimationRef.current, postEstimationOrder.order);
        toast.success(
          pledged
            ? 'Pledged Post-Estimation downloaded'
            : 'Post-Estimation downloaded'
        );
      } catch (err) {
        toast.error('Download failed: ' + err.message);
      } finally {
        if (!cancelled) {
          setDownloadingPostEstimation((p) => ({ ...p, [orderId]: false }));
          setPostEstimationOrder(null);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [postEstimationOrder]);

  const openScanner = (orderId) => {
    setScanningOrderId(orderId);
    setQrModalOpen(true);
    setScanning(true);
  };

  const closeScanner = () => {
    setQrModalOpen(false);
    setScanning(false);
    setScanningOrderId(null);
  };

  const handleScan = async (data) => {
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      const { orderId, secret } = parsed;
      if (orderId !== scanningOrderId) {
        toast.error('QR does not match this order');
        closeScanner();
        return;
      }
      const res = await fetch('/api/orders/verify-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          agentId: user.id,
          agentLat: null,
          agentLng: null,
          qrSecret: secret,
        }),
      });
      const data2 = await res.json();
      if (!res.ok) throw new Error(data2.error);
      toast.success('✅ Agent verified!');
      setAssignedOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'AGENT_ARRIVED' } : o))
      );
      setTimeout(closeScanner, 1500);
    } catch (err) {
      toast.error('❌ ' + err.message);
    }
  };

  const sendOffer = async (
    orderId,
    totalNetWeight,
    purity,
    offeredPrice,
    paymentMode,
    items,
    pledgeDetails = {}
  ) => {
    setSendingOffer((p) => ({ ...p, [orderId]: true }));
    try {
      const res = await fetch('/api/orders/agent-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          agentId: user.id,
          weight: parseFloat(totalNetWeight),
          purity,
          offeredPrice: parseFloat(offeredPrice),
          paymentMode,
          items,
          ...pledgeDetails,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('✅ Offer sent!');
      setAssignedOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setSendingOffer((p) => ({ ...p, [orderId]: false }));
    }
  };

  const respondToAdmin = async (orderId, action, offerPrice, comment) => {
    setResponding((p) => ({ ...p, [orderId]: true }));
    try {
      const res = await fetch('/api/orders/agent-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          agentId: user.id,
          action,
          offerPrice: offerPrice ? parseFloat(offerPrice) : null,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('✅ Response sent!');
      setAssignedOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setResponding((p) => ({ ...p, [orderId]: false }));
    }
  };

  // ---- Signed receipt upload ----
  const handleUploadSigned = async (orderId, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10 MB.');
      return;
    }

    setUploadingSigned((prev) => ({ ...prev, [orderId]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append(
        'upload_preset',
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      );

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: 'POST', body: formData }
      );
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) {
        throw new Error(cloudData.error?.message || 'Cloudinary upload failed');
      }

      const res = await fetch(`/api/orders/${orderId}/upload-signed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cloudData.secure_url, uploadedBy: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('✅ Signed document uploaded');
      setAssignedOrders((prev) =>
        prev.map((o) => (o.id === orderId ? data.order : o))
      );
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setUploadingSigned((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // ---- Pledge declaration upload ----
  const handleUploadPledgeDeclaration = async (orderId, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10 MB.');
      return;
    }

    setUploadingPledge((prev) => ({ ...prev, [orderId]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append(
        'upload_preset',
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      );

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: 'POST', body: formData }
      );
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) {
        throw new Error(cloudData.error?.message || 'Cloudinary upload failed');
      }

      const res = await fetch(
        `/api/orders/${orderId}/upload-pledge-declaration`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cloudData.secure_url,
            uploadedBy: user.id,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('✅ Pledge declaration uploaded');
      setAssignedOrders((prev) =>
        prev.map((o) => (o.id === orderId ? data.order : o))
      );
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setUploadingPledge((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      AGENT_ASSIGNED: { color: 'bg-blue-100 text-blue-700', label: 'Assigned' },
      AGENT_ARRIVED: { color: 'bg-green-100 text-green-700', label: 'Verified' },
      AGENT_OFFER_SENT: { color: 'bg-purple-100 text-purple-700', label: 'Offer Sent' },
      ADMIN_OFFER_SENT: { color: 'bg-orange-100 text-orange-700', label: 'Admin Offer' },
      NEGOTIATING: { color: 'bg-yellow-100 text-yellow-700', label: 'Negotiating' },
      CUSTOMER_PENDING_ACCEPTANCE: { color: 'bg-indigo-100 text-indigo-700', label: 'Customer Pending' },
      COMPLETED: { color: 'bg-gray-100 text-gray-700', label: 'Completed' },
      REJECTED_BY_CUSTOMER: { color: 'bg-red-100 text-red-700', label: 'Rejected' },
      DEAL_CLOSED: { color: 'bg-gray-100 text-gray-700', label: 'Closed' },
    };
    return configs[status] || { color: 'bg-gray-100 text-gray-700', label: status };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24">
      <Toaster position="top-center" />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">My Orders</h1>
        <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
          {assignedOrders.length} Active
        </div>
      </div>

      {assignedOrders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-gray-700">No orders assigned</h3>
        </div>
      ) : (
        <AnimatePresence>
          {assignedOrders.map((order, index) => {
            const sc = getStatusBadge(order.status);
            const isAssigned = order.status === 'AGENT_ASSIGNED';
            const isVerified = order.status === 'AGENT_ARRIVED';
            const isOfferSent = order.status === 'AGENT_OFFER_SENT';
            const hasAdminOffer = ['ADMIN_OFFER_SENT', 'NEGOTIATING'].includes(order.status);
            const isCustomerPending = order.status === 'CUSTOMER_PENDING_ACCEPTANCE';
            const isCompleted = order.status === 'COMPLETED';
            const isClosed = ['DEAL_CLOSED', 'REJECTED_BY_CUSTOMER'].includes(order.status);
            const canViewReceipt = ['CUSTOMER_PENDING_ACCEPTANCE', 'COMPLETED'].includes(order.status);
            const needsSignedUpload = isCompleted && order.receiptAcknowledgedAt;
            const isDownloadingThis = !!downloadingPostEstimation[order.id];

            // Can the agent download the doc? Only after verification.
            const canDownloadDoc =
              isVerified || isOfferSent || hasAdminOffer;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden"
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-2 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-gray-600">
                      #{order.id.slice(-8)}
                    </span>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${sc.color}`}>
                      {sc.label}
                    </span>
                    {order.isPledged && (
                      <span className="text-xs bg-rose-100 text-rose-700 px-3 py-1 rounded-full font-medium">
                        🔒 Pledged
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-gray-400 gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Customer Info */}
                {order.customer && (
                  <div className="px-6 py-3 bg-amber-50/60 border-b border-amber-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">👤 Customer</span>
                      <span className="font-semibold text-gray-800">{order.customer.name}</span>
                    </div>
                    {order.customer.phone && (
                      <a
                        href={`tel:${order.customer.phone}`}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        📞 {order.customer.phone}
                      </a>
                    )}
                    {order.customer.aadhaarNumber && (
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <span>Aadhaar:</span>
                        <span className="font-mono">
                          XXXX XXXX {order.customer.aadhaarNumber.slice(-4)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Pledge block — only if the order has been flagged as pledged */}
                {order.isPledged && (
                  <div className="px-6 py-3 bg-rose-50 border-b border-rose-100 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔒</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-rose-800">
                          Pledged gold — bank/NBFC release
                        </p>
                        {order.pledgeBankName && (
                          <p className="text-xs text-rose-600">
                            {order.pledgeBankName} · A/c {order.pledgeLoanAccountNo} · ₹
                            {Number(order.pledgeOutstandingAmount || 0).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pledged-version download — only after verification */}
                    {canDownloadDoc && (
                      <button
                        type="button"
                        onClick={() =>
                          setPostEstimationOrder({ order, forcePledged: true })
                        }
                        disabled={isDownloadingThis}
                        className="w-full bg-white border border-rose-300 text-rose-700 font-medium py-2 rounded-xl hover:bg-rose-100 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isDownloadingThis
                          ? '⏳ Preparing PDF…'
                          : '📄 Download Pledged Post-Estimation'}
                      </button>
                    )}

                    {/* Signed declaration upload / view */}
                    {order.pledgeDeclarationUrl ? (
                      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                        <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-green-800">
                            Signed declaration uploaded
                          </p>
                          <p className="text-xs text-green-600">
                            {order.pledgeDeclarationUploadedAt
                              ? new Date(
                                  order.pledgeDeclarationUploadedAt
                                ).toLocaleString()
                              : ''}
                          </p>
                        </div>
                        <a
                          href={order.pledgeDeclarationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-700 underline font-medium hover:text-green-900 whitespace-nowrap"
                        >
                          View
                        </a>
                      </div>
                    ) : (
                      <label
                        className={`flex items-center justify-center gap-2 bg-white hover:bg-rose-100 border-2 border-dashed border-rose-300 rounded-xl px-4 py-3 cursor-pointer transition ${
                          uploadingPledge[order.id] ? 'opacity-60' : ''
                        }`}
                      >
                        {uploadingPledge[order.id] ? (
                          <>
                            <div className="w-5 h-5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-medium text-rose-700">
                              Uploading...
                            </span>
                          </>
                        ) : (
                          <>
                            <DocumentArrowUpIcon className="w-5 h-5 text-rose-600" />
                            <span className="text-sm font-medium text-rose-700">
                              Upload signed pledge declaration (photo or PDF)
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          disabled={!!uploadingPledge[order.id]}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadPledgeDeclaration(order.id, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* Body */}
                <div className="px-6 py-5">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Weight</span>
                      <span className="font-medium">{order.weight}g</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Purity</span>
                      <span className="font-medium">{order.purity}</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <CurrencyRupeeIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Est. Total</span>
                      <span className="font-medium">₹{order.estimatedTotal?.toFixed(2)}</span>
                    </div>
                    {order.agentOffer && (
                      <div className="col-span-2 bg-blue-50 px-3 py-1.5 rounded-lg">
                        <span className="text-blue-700 font-semibold">
                          Your Offer: ₹{order.agentOffer.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {order.adminOffer && (
                      <div className="col-span-2 bg-orange-50 px-3 py-1.5 rounded-lg">
                        <span className="text-orange-700 font-semibold">
                          Admin Offer: ₹{order.adminOffer.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {order.finalPrice && (
                      <div className="col-span-2 bg-green-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 font-semibold">
                          Final: ₹{order.finalPrice.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Active flow actions */}
                  {!isCompleted && !isClosed && !isCustomerPending && (
                    <div className="mt-4 space-y-3">
                     
                      

                      {/* Scan QR — only on AGENT_ASSIGNED */}
                      {isAssigned && (
                        <button
                          onClick={() => openScanner(order.id)}
                          className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-semibold py-3 rounded-xl shadow-md flex items-center justify-center gap-2"
                        >
                          <span className="text-xl">📸</span> Scan Customer QR
                        </button>
                      )}

                      {/* Offer form — only on AGENT_ARRIVED */}
                      {isVerified && (
                        <OfferForm
                          orderId={order.id}
                          order={order}
                          onSendOffer={sendOffer}
                          sending={sendingOffer[order.id]}
                        />
                      )}

                      {isOfferSent && (
                        <div className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-lg flex items-center gap-2">
                          <ClockIcon className="w-5 h-5 animate-pulse" />
                          Waiting for admin response...
                        </div>
                      )}

                      {hasAdminOffer && (
                        <AdminOfferResponse
                          order={order}
                          onRespond={respondToAdmin}
                          responding={responding[order.id]}
                        />
                      )}
                    </div>
                  )}

                  {isCustomerPending && (
                    <div className="mt-4 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-lg flex items-center gap-2">
                      <ClockIcon className="w-5 h-5 animate-pulse" />
                      Waiting for customer to accept the receipt...
                    </div>
                  )}

                  {isCompleted && (
                    <div className="mt-4 bg-gray-100 text-gray-600 px-4 py-3 rounded-lg flex items-center gap-2">
                      <CheckCircleIcon className="w-5 h-5" />
                      Purchase completed ✅
                      {order.receiptAcknowledgedAt && (
                        <span className="text-xs text-green-600 ml-auto">
                          Receipt acknowledged
                        </span>
                      )}
                    </div>
                  )}

                  {isClosed && (
                    <div className="mt-4 bg-gray-100 text-gray-600 px-4 py-3 rounded-lg flex items-center gap-2">
                      <XMarkIcon className="w-5 h-5" />
                      Deal closed
                      {order.comment && (
                        <span className="text-xs text-gray-400 ml-2">
                          💬 {order.comment}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Receipt Section */}
                  {canViewReceipt && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => setReceiptOrder(order)}
                        className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition"
                      >
                        <DocumentTextIcon className="w-5 h-5" />
                        View Purchase Receipt
                      </button>
                    </div>
                  )}

                  {/* Signed Receipt Upload Section */}
                  {needsSignedUpload && (
                    <div className="mt-3 space-y-2">
                      {order.signedDocumentUrl ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
                          <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-green-800">
                              Signed receipt uploaded
                            </p>
                            <p className="text-xs text-green-600">
                              {order.signedDocumentUploadedAt
                                ? new Date(
                                    order.signedDocumentUploadedAt
                                  ).toLocaleString()
                                : ''}
                            </p>
                          </div>
                          <a
                            href={order.signedDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-700 underline font-medium hover:text-green-900 whitespace-nowrap"
                          >
                            View
                          </a>
                        </div>
                      ) : (
                        <label
                          className={`flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 rounded-xl px-4 py-3 cursor-pointer transition ${
                            uploadingSigned[order.id] ? 'opacity-60' : ''
                          }`}
                        >
                          {uploadingSigned[order.id] ? (
                            <>
                              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              <span className="text-sm font-medium text-blue-700">
                                Uploading...
                              </span>
                            </>
                          ) : (
                            <>
                              <DocumentArrowUpIcon className="w-5 h-5 text-blue-600" />
                              <span className="text-sm font-medium text-blue-700">
                                Upload Signed Receipt (photo or PDF)
                              </span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            disabled={!!uploadingSigned[order.id]}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadSigned(order.id, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {qrModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeScanner}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Scan QR</h2>
                <button onClick={closeScanner} className="text-gray-400">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="relative bg-gray-100 rounded-xl overflow-hidden aspect-square">
                {scanning ? (
                  <QrScanner
                    onScan={handleScan}
                    onError={(e) => toast.error(e)}
                    onClose={closeScanner}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Scanning stopped
                  </div>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setScanning(true)}
                  className="flex-1 bg-gray-200 py-2 rounded-xl"
                >
                  Retry
                </button>
                <button
                  onClick={closeScanner}
                  className="flex-1 bg-red-500 text-white py-2 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!receiptOrder}
        onClose={() => setReceiptOrder(null)}
        order={receiptOrder}
        mode="agent"
      />

      {/* Hidden Post-Estimation document — renders offscreen, then downloads */}
      {postEstimationOrder && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: '-10000px',
            top: 0,
            pointerEvents: 'none',
          }}
        >
          <PostEstimationDocument
            ref={postEstimationRef}
            order={postEstimationOrder.order}
            forcePledged={postEstimationOrder.forcePledged}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// Admin Offer Response
// ============================================
function AdminOfferResponse({ order, onRespond, responding }) {
  const [counterPrice, setCounterPrice] = useState('');
  const [comment, setComment] = useState('');
  const [showCounter, setShowCounter] = useState(false);

  return (
    <div className="space-y-3 bg-orange-50 p-4 rounded-xl border border-orange-200">
      <p className="text-sm font-semibold text-orange-700">
        💬 Admin has sent an offer
      </p>
      {!showCounter ? (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onRespond(order.id, 'accept_admin_offer', null, '')}
            disabled={responding}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
          >
            {responding ? '⏳' : <CheckCircleIcon className="w-4 h-4" />} Accept
          </button>
          <button
            onClick={() => setShowCounter(true)}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm"
          >
            Counter
          </button>
          <button
            onClick={() => {
              const reason = prompt('Reason for closing?');
              onRespond(order.id, 'close_deal', null, reason || 'Deal closed');
            }}
            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm"
          >
            Close
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="number"
            placeholder="Counter offer"
            value={counterPrice}
            onChange={(e) => setCounterPrice(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!counterPrice) {
                  toast.error('Enter a price');
                  return;
                }
                onRespond(order.id, 'counter_offer', parseFloat(counterPrice), comment);
                setShowCounter(false);
                setCounterPrice('');
                setComment('');
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              Send
            </button>
            <button
              onClick={() => setShowCounter(false)}
              className="text-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}