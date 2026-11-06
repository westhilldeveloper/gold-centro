'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  UserCircleIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  FireIcon,
  DocumentTextIcon,
  PhotoIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  Square3Stack3DIcon,
  ArrowDownTrayIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import ItemPipelineModal from '../../../components/ItemPipelineModal';
import ItemImageCarousel, {
  getImageUrls,
} from '../../../components/ItemImageCarousel';
import ImagePreview from '../../../components/ImagePreview';

const STATUS_STYLES = {
  AGENT_ASSIGNED: 'bg-blue-100 text-blue-700',
  AGENT_ARRIVED: 'bg-green-100 text-green-700',
  AGENT_OFFER_SENT: 'bg-purple-100 text-purple-700',
  ADMIN_OFFER_SENT: 'bg-orange-100 text-orange-700',
  NEGOTIATING: 'bg-yellow-100 text-yellow-700',
  CUSTOMER_PENDING_ACCEPTANCE: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  REJECTED_BY_CUSTOMER: 'bg-red-100 text-red-700',
  DEAL_CLOSED: 'bg-gray-100 text-gray-700',
};

const ITEM_STATUS = {
  AT_BRANCH: {
    label: 'At branch',
    badge: 'bg-green-100 text-green-700',
    icon: BuildingStorefrontIcon,
  },
  WITH_AGENT: {
    label: 'With agent',
    badge: 'bg-purple-100 text-purple-700',
    icon: UserCircleIcon,
  },
  IN_TRANSIT: {
    label: 'In transit',
    badge: 'bg-yellow-100 text-yellow-700',
    icon: TruckIcon,
  },
  IN_MELTING: {
    label: 'In melting',
    badge: 'bg-orange-100 text-orange-700',
    icon: FireIcon,
  },
  MELTED: {
    label: 'Melted',
    badge: 'bg-gray-100 text-gray-700',
    icon: Square3Stack3DIcon,
  },
  IN_PROGRESS: {
    label: 'In progress',
    badge: 'bg-blue-100 text-blue-700',
    icon: ClockIcon,
  },
  UNKNOWN: {
    label: 'Unknown',
    badge: 'bg-gray-100 text-gray-600',
    icon: ClockIcon,
  },
};

const TIMELINE_ICONS = {
  document: DocumentTextIcon,
  check: CheckCircleIcon,
  clock: ClockIcon,
  building: BuildingStorefrontIcon,
  truck: TruckIcon,
  x: XCircleIcon,
  fire: FireIcon,
  bars: Square3Stack3DIcon,
};

const TIMELINE_COLORS = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200', line: 'bg-blue-300' },
  green: { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-200', line: 'bg-green-300' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-200', line: 'bg-yellow-300' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-200', line: 'bg-purple-300' },
  red: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-200', line: 'bg-red-300' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-200', line: 'bg-orange-300' },
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pipelineItemId, setPipelineItemId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/orders/${id}/pipeline`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d);
        else toast.error(d.error || 'Failed to load');
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Fast lookup: itemId -> item object (has imageUrls, name, etc.)
  const itemLookup = useMemo(() => {
    if (!data) return {};
    const map = {};
    data.items.forEach(({ item }) => {
      map[item.id] = item;
    });
    return map;
  }, [data]);

  // Group items by their current status (for the "where items are now" strip)
  const itemsByStatus = useMemo(() => {
    if (!data) return {};
    const groups = {};
    data.items.forEach((p) => {
      const s = p.currentStatus || 'UNKNOWN';
      if (!groups[s]) groups[s] = [];
      groups[s].push(p.item);
    });
    return groups;
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl">
        Failed to load order.
      </div>
    );
  }

  const { order, items, orderTimeline, deposit, stats } = data;
  const statusStyle =
    STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700';
  const statusLabel = (order.status || '').replace(/_/g, ' ');

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <Toaster position="top-center" />

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeftIcon className="w-4 h-4" /> Back to Orders
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        
<div className="flex flex-wrap items-start justify-between gap-4">
  <div>
    <p className="font-mono text-sm text-gray-500">
      Order #{order.id.slice(-8).toUpperCase()}
    </p>
    <h1 className="text-2xl font-bold text-gray-900 mt-1">
      {order.customer?.name || 'Customer'}
    </h1>
    <p className="text-sm text-gray-500 mt-0.5">
      {new Date(order.createdAt).toLocaleString()}
    </p>
  </div>
  
  {/* ADD THIS: Status & Type badges */}
  <div className="flex flex-col items-end gap-2">
    <span className={`text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide ${statusStyle}`}>
      {statusLabel}
    </span>
    <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
      order.orderType === 'BRANCH_DIRECT' 
        ? 'bg-purple-100 text-purple-700 border border-purple-200' 
        : 'bg-blue-100 text-blue-700 border border-blue-200'
    }`}>
      {order.orderType === 'BRANCH_DIRECT' ? 'Branch Direct Purchase' : 'Agent Purchase'}
    </span>
  </div>
</div>



        {/* Big stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Net weight
            </p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">
              {(order.weight || 0).toFixed(2)}g
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Purity
            </p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">
              {order.purity || '—'}
            </p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 border border-green-200">
            <p className="text-[10px] uppercase tracking-wider text-green-700 font-semibold">
              Final price
            </p>
            <p className="text-lg font-bold text-green-800 mt-0.5">
              ₹
              {(
                order.finalPrice ||
                order.agentOffer ||
                order.estimatedTotal ||
                0
              ).toFixed(2)}
            </p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
            <p className="text-[10px] uppercase tracking-wider text-yellow-700 font-semibold">
              Items
            </p>
            <p className="text-lg font-bold text-yellow-800 mt-0.5">
              {stats.totalItems} • {stats.totalPieces} pc
            </p>
          </div>
        </div>

        {/* ⭐ Item thumbnails strip */}
        {items.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
              Items in this order
            </p>
            <ItemThumbStrip
              items={items.map((p) => p.item)}
              onOpenPipeline={setPipelineItemId}
              onPreview={setPreviewImage}
              max={8}
            />
          </div>
        )}
      </div>

      {/* People + Branch */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCircleIcon className="w-4 h-4 text-gray-500" />
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Customer
            </p>
          </div>
          <p className="font-semibold text-gray-900">
            {order.customer?.name || '—'}
          </p>
          {order.customer?.phone && (
            <p className="text-xs text-gray-500">{order.customer.phone}</p>
          )}
        </div>

       
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCircleIcon className="w-4 h-4 text-gray-500" />
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              {order.orderType === 'BRANCH_DIRECT' ? 'Staff' : 'Agent'}
            </p>
          </div>
          <p className="font-semibold text-gray-900">
            {order.orderType === 'BRANCH_DIRECT' 
              ? (order.staff?.name || '—') 
              : (order.agent?.name || '—')}
          </p>
          {(order.orderType === 'BRANCH_DIRECT' ? order.staff?.phone : order.agent?.phone) && (
            <p className="text-xs text-gray-500">
              {order.orderType === 'BRANCH_DIRECT' ? order.staff.phone : order.agent.phone}
            </p>
          )}
          {order.agent?.branch && order.orderType !== 'BRANCH_DIRECT' && (
            <p className="text-[10px] text-gray-400 mt-1">
              Home branch: {order.agent.branch.name}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BuildingStorefrontIcon className="w-4 h-4 text-gray-500" />
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Handled by
            </p>
          </div>
          <p className="font-semibold text-gray-900">
            {order.branch?.name || 'Not yet assigned'}
          </p>
          {order.branch?.code && (
            <p className="text-xs text-gray-500 font-mono">
              {order.branch.code}
            </p>
          )}
        </div>
      </div>

      {/* ⭐ Where items are now — with thumbnails */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          📍 Where the items are now
        </p>
        <div className="space-y-3">
          {Object.entries(stats.byStatus).map(([status, count]) => {
            const cfg = ITEM_STATUS[status] || ITEM_STATUS.UNKNOWN;
            const Icon = cfg.icon;
            const statusItems = itemsByStatus[status] || [];
            return (
              <div
                key={status}
                className="bg-gray-50 rounded-xl p-3 border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.badge}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {count} item{count > 1 ? 's' : ''} {cfg.label.toLowerCase()}
                  </span>
                </div>
                <ItemThumbStrip
                  items={statusItems}
                  onOpenPipeline={setPipelineItemId}
                  onPreview={setPreviewImage}
                  size={44}
                  max={12}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ⭐ Unified timeline — with per-event thumbnails */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Journey ({orderTimeline.length} events)
        </h2>

        <div className="relative">
          {orderTimeline.map((event, idx) => {
            const Icon = TIMELINE_ICONS[event.icon] || DocumentTextIcon;
            const colors = TIMELINE_COLORS[event.color] || TIMELINE_COLORS.blue;
            const isLast = idx === orderTimeline.length - 1;
            const touchesAll = event.itemCount === stats.totalItems;
            const touchesSome = event.itemCount < stats.totalItems;

            // Resolve items involved in this event 
            const eventItems = (event.itemIds || [])
              .map((iid) => itemLookup[iid])
              .filter(Boolean);

            return (
              <motion.div
                key={`${event.stage}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="flex gap-3 relative pb-6"
              >
                {!isLast && (
                  <div
                    className={`absolute left-5 top-10 bottom-0 w-0.5 ${colors.line}`}
                    style={{ opacity: 0.4 }}
                  />
                )}

                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center ring-4 ${colors.ring} z-10`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 pt-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">
                      {event.label}
                    </p>
                    {touchesSome && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        {event.itemCount} of {stats.totalItems} items
                      </span>
                    )}
                    {touchesAll && stats.totalItems > 1 && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        all items
                      </span>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">
                      {event.description}
                    </p>
                  )}

                  {/* ⭐ Item thumbnails for this event */}
                  {eventItems.length > 0 && (
                    <div className="mt-2">
                      <ItemThumbStrip
                        items={eventItems}
                        onOpenPipeline={setPipelineItemId}
                        onPreview={setPreviewImage}
                        size={40}
                        max={6}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-gray-400">
                    {event.timestamp && (
                      <span>
                        🕐 {new Date(event.timestamp).toLocaleString()}
                      </span>
                    )}
                    {event.location && (
                      <span>
                        📍 {event.location.name}
                        {event.location.code && ` (${event.location.code})`}
                      </span>
                    )}
                    {event.actor && <span>👤 {event.actor.name}</span>}
                    {event.siblingCount > 0 && (
                      <span>
                        👥 +{event.siblingCount} sibling item
                        {event.siblingCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {event.handoverSheetUrl && (
                    <a
                      href={event.handoverSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 mt-1.5 underline font-medium"
                    >
                      <ArrowDownTrayIcon className="w-3 h-3" /> View signed
                      handover sheet
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Items — full cards */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Items ({items.length})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map(({ item, currentStatus, currentLocationLabel }) => {
            const cfg = ITEM_STATUS[currentStatus] || ITEM_STATUS.UNKNOWN;
            const StatusIcon = cfg.icon;
            const images = getImageUrls(item);
            const purity = item.purity || order.purity;

            return (
              <div
                key={item.id}
                className="bg-gray-50 rounded-2xl p-3 border border-gray-100 hover:border-yellow-400 transition cursor-pointer"
                onClick={() => setPipelineItemId(item.id)}
              >
                <div className="flex gap-3">
                  <ItemImageCarousel
                    images={images}
                    alt={item.name}
                    onPreview={setPreviewImage}
                    size={72}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {item.name}
                      </p>
                      <span className="text-xs bg-white text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                        ×{item.count}
                      </span>
                      {purity && (
                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                          {purity}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex gap-3 text-xs text-gray-600">
  <span>Gross <strong className="text-gray-800">{(item.grossWeight || 0).toFixed(2)}g</strong></span>
  <span>Net <strong className="text-yellow-700">{(item.netWeight || 0).toFixed(2)}g</strong></span>
</div>

{/* ADD THIS: Show Pre-Estimation if it exists */}
{item.preEstimationGrossWeight && (
  <div className="mt-1.5 inline-block text-[10px] bg-orange-50 text-orange-800 px-2 py-1 rounded border border-orange-100">
    Pre-Est: <strong>{item.preEstimationGrossWeight.toFixed(2)}g</strong> ({item.preEstimationPurity || '—'})
  </div>
)}

                    <div className="mt-2 flex items-center gap-1.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${cfg.badge}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-gray-500 truncate">
                        {currentLocationLabel}
                      </span>
                    </div>

                    <p className="text-[10px] text-blue-500 mt-1.5 font-medium">
                      View full pipeline →
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Documents */}
            {/* Documents */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Documents
        </h2>
        <div className="flex flex-wrap gap-3">
          
          {/* Branch Direct Purchase Agreement */}
          {order.orderType === 'BRANCH_DIRECT' && (
            <DocumentLink
              label="Signed Purchase Agreement"
              url={order.purchaseAgreementUrl}
            />
          )}

          {/* Agent Purchase Documents */}
          {order.orderType !== 'BRANCH_DIRECT' && (
            <>
              <DocumentLink
                label="Signed receipt"
                url={order.signedDocumentUrl}
              />
              <DocumentLink
                label="Pledge declaration"
                url={order.pledgeDeclarationUrl}
              />
            </>
          )}

          {order.receiptAcknowledgedAt && (
            <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 px-3 py-2 rounded-xl text-green-800">
              <CheckCircleIcon className="w-4 h-4" />
              Receipt acknowledged{' '}
              {new Date(order.receiptAcknowledgedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Pledge details (Applies to both types if marked as pledged) */}
        {order.isPledged && (
          <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold flex items-center gap-1">
              <LockClosedIcon className="w-3.5 h-3.5" /> Pledged
            </p>
            <p className="text-sm text-gray-800 mt-1">
              {order.pledgeBankName} • A/c{' '}
              {order.pledgeLoanAccountNo} • ₹
              {(order.pledgeOutstandingAmount || 0).toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Item pipeline modal */}
      <ItemPipelineModal
        itemId={pipelineItemId}
        onClose={() => setPipelineItemId(null)}
      />

      {/* Image preview */}
      <ImagePreview
        src={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}

/* ---------------------------------------------------------
   ItemThumbStrip — row of item thumbnails
   • Click thumbnail → opens item pipeline
   • Click the small expand icon → opens full-screen preview
   • "+N more" chip when max exceeded
   --------------------------------------------------------- */
function ItemThumbStrip({
  items,
  onOpenPipeline,
  onPreview,
  size = 48,
  max = 8,
}) {
  if (!items?.length) return null;

  const visible = items.slice(0, max);
  const extra = items.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((item) => {
        const images = getImageUrls(item);
        const first = images[0];
        const multiCount = images.length;

        return (
          <div
            key={item.id}
            className="relative group"
            title={`${item.name}${
              item.count > 1 ? ` ×${item.count}` : ''
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPipeline(item.id);
              }}
              className="block rounded-lg overflow-hidden border-2 border-gray-200 hover:border-yellow-400 transition bg-white"
              style={{ width: size, height: size }}
            >
              {first ? (
                <img
                  src={first}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <PhotoIcon
                    className="w-1/2 h-1/2"
                    style={{
                      width: size * 0.5,
                      height: size * 0.5,
                    }}
                  />
                </div>
              )}
            </button>

            {/* Multi-image badge */}
            {multiCount > 1 && (
              <span
                className="absolute bottom-0.5 right-0.5 text-[8px] bg-black/60 text-white px-1 py-0.5 rounded-full leading-none pointer-events-none"
                title={`${multiCount} photos`}
              >
                {multiCount}
              </span>
            )}

            {/* Hover: quick preview button (top-right corner) */}
            {first && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(first);
                }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md"
                title="Quick preview"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3 h-3"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        );
      })}

      {extra > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold"
          style={{ width: size, height: size }}
          title={`+${extra} more item${extra > 1 ? 's' : ''}`}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

function DocumentLink({ label, url }) {
  if (!url) {
    return (
      <div className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-gray-400 italic">
        <DocumentTextIcon className="w-4 h-4" />
        {label} not available
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl text-blue-800 hover:bg-blue-100 transition font-medium"
    >
      <DocumentTextIcon className="w-4 h-4" />
      {label}
      <ArrowDownTrayIcon className="w-3.5 h-3.5" />
    </a>
  );
}   