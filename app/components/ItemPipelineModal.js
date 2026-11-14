// app/components/ItemPipelineModal.jsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  XCircleIcon,
  PhotoIcon,
  FireIcon,
  Square3Stack3DIcon,
  ArrowDownTrayIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

const ICONS = {
  document: DocumentTextIcon,
  check: CheckCircleIcon,
  clock: ClockIcon,
  building: BuildingStorefrontIcon,
  truck: TruckIcon,
  x: XCircleIcon,
  fire: FireIcon,
  bars: Square3Stack3DIcon,
};

const COLORS = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200', line: 'bg-blue-300' },
  green: { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-200', line: 'bg-green-300' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-200', line: 'bg-yellow-300' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-200', line: 'bg-purple-300' },
  red: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-200', line: 'bg-red-300' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-200', line: 'bg-orange-300' },
};

// ✅ NEW: styling + label for current status
const STATUS_CARD_STYLES = {
  AT_BRANCH: { wrap: 'bg-green-50 border-green-200', title: 'text-green-800' },
  IN_TRANSIT: { wrap: 'bg-yellow-50 border-yellow-200', title: 'text-yellow-800' },
  WITH_AGENT: { wrap: 'bg-purple-50 border-purple-200', title: 'text-purple-800' },
  WITH_AGENT_CARRIER: { wrap: 'bg-orange-50 border-orange-200', title: 'text-orange-800' },
  IN_MELTING: { wrap: 'bg-orange-50 border-orange-200', title: 'text-orange-800' },
  MELTED: { wrap: 'bg-gray-50 border-gray-200', title: 'text-gray-800' },
  IN_PROGRESS: { wrap: 'bg-blue-50 border-blue-200', title: 'text-blue-800' },
  UNKNOWN: { wrap: 'bg-gray-50 border-gray-200', title: 'text-gray-800' },
};

export default function ItemPipelineModal({ itemId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (!itemId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError('');
    setData(null);

    fetch(`/api/items/${itemId}/pipeline`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d);
        else setError(d.error || 'Failed to load');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [itemId]);

  return (
    <AnimatePresence>
      {itemId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 22 }}
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Item Pipeline</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Full journey from purchase to current location
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-red-700 font-medium">Failed to load pipeline</p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                  <p className="text-xs text-red-500 mt-3 font-mono">
                    Item ID: {itemId}
                  </p>
                </div>
              ) : !data ? (
                <p className="text-center text-gray-500 py-8">No data available.</p>
              ) : (
                <div className="space-y-6">
                  {/* Item card */}
                  <div className="flex gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    {(() => {
                      const firstImg =
                        Array.isArray(data.item.imageUrls) &&
                        data.item.imageUrls.length > 0
                          ? data.item.imageUrls[0]
                          : null;
                      return (
                        <button
                          type="button"
                          onClick={() => firstImg && setPreviewImage(firstImg)}
                          disabled={!firstImg}
                          className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 bg-white flex items-center justify-center disabled:cursor-default hover:border-yellow-400 transition"
                        >
                          {firstImg ? (
                            <img
                              src={firstImg}
                              alt={data.item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <PhotoIcon className="w-10 h-10 text-gray-300" />
                          )}
                        </button>
                      );
                    })()}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">
                          {data.item.name}
                        </h3>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                          ×{data.item.count}
                        </span>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                          {data.item.purity}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-xs">
                        <div>
                          <span className="text-gray-400">Order:</span>{' '}
                          <span className="font-mono text-gray-700">
                            #{data.item.orderId?.slice(-8)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Gross:</span>{' '}
                          <span className="font-medium">
                            {data.item.grossWeight?.toFixed(2)}g
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Customer:</span>{' '}
                          <span className="text-gray-700">
                            {data.item.customer?.name || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Net:</span>{' '}
                          <span className="font-bold text-yellow-700">
                            {data.item.netWeight?.toFixed(2)}g
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Agent:</span>{' '}
                          <span className="text-gray-700">
                            {data.item.agent?.name || 'N/A'}
                          </span>
                        </div>
                        {data.item.finalPrice && (
                          <div>
                            <span className="text-gray-400">Price:</span>{' '}
                            <span className="font-medium text-green-700">
                              ₹{data.item.finalPrice.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ✅ Current status — with carrier support */}
                  {(() => {
                    const cfg =
                      STATUS_CARD_STYLES[data.currentStatus] ||
                      STATUS_CARD_STYLES.UNKNOWN;
                    return (
                      <div className={`rounded-2xl p-4 border-2 ${cfg.wrap}`}>
                        <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">
                          Current Status
                        </p>
                        <p className={`text-lg font-bold mt-1 ${cfg.title}`}>
                          {data.currentLocationLabel}
                        </p>
                        {data.currentStatus === 'WITH_AGENT_CARRIER' &&
                          data.currentCarrierAgent && (
                            <p className="text-xs text-orange-700 mt-1">
                              📞 {data.currentCarrierAgent.phone || '—'}
                            </p>
                          )}
                      </div>
                    );
                  })()}

                  {/* Timeline */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wider">
                      Journey Timeline ({data.timeline?.length || 0} stages)
                    </h4>

                    {!data.timeline || data.timeline.length === 0 ? (
                      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center">
                        <ClockIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">
                          No timeline events yet.
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Events appear as the item moves through the pipeline.
                        </p>
                      </div>
                    ) : (
                      <div className="relative">
                        {data.timeline.map((stage, idx) => {
                          const Icon = ICONS[stage.icon] || DocumentTextIcon;
                          const colors = COLORS[stage.color] || COLORS.blue;
                          const isLast = idx === data.timeline.length - 1;

                          return (
                            <motion.div
                              key={`${stage.stage}-${idx}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.06 }}
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

                              <div className="flex-1 pt-1.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-gray-900 text-sm">
                                    {stage.label}
                                  </p>
                                  {stage.siblingCount > 0 && (
                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                      +{stage.siblingCount} sibling item
                                      {stage.siblingCount > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                                {stage.description && (
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    {stage.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-gray-400">
                                  {stage.timestamp && (
                                    <span>
                                      🕐{' '}
                                      {new Date(stage.timestamp).toLocaleString()}
                                    </span>
                                  )}
                                  {stage.location && (
                                    <span>
                                      📍 {stage.location.name}
                                      {stage.location.code &&
                                        ` (${stage.location.code})`}
                                    </span>
                                  )}
                                  {stage.actor && (
                                    <span>👤 {stage.actor.name}</span>
                                  )}
                                </div>

                                {/* ✅ NEW: Note links on SENT / RECEIVED events */}
                                {(stage.transferNoteUrl ||
                                  stage.receivingNoteUrl) && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {stage.transferNoteUrl && (
                                      <a
                                        href={stage.transferNoteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-2 py-1 rounded-lg font-medium transition"
                                      >
                                        <DocumentTextIcon className="w-3 h-3" />
                                        Transfer Note
                                        <ArrowDownTrayIcon className="w-3 h-3" />
                                      </a>
                                    )}
                                    {stage.receivingNoteUrl && (
                                      <a
                                        href={stage.receivingNoteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] bg-green-50 hover:bg-green-100 border border-green-200 text-green-800 px-2 py-1 rounded-lg font-medium transition"
                                      >
                                        <DocumentTextIcon className="w-3 h-3" />
                                        Receiving Note
                                        <ArrowDownTrayIcon className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Debug info — remove in production */}
                  {data._debug && (
                    <div className="text-[10px] text-gray-400 border-t border-gray-100 pt-3 font-mono">
                      Debug: deposit={String(data._debug.hasDeposit)} · movements=
                      {data._debug.movementsCount} · timeline=
                      {data._debug.timelineLength}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={onClose}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl"
              >
                Close
              </button>
            </div>
          </motion.div>

          {/* Image preview */}
          <AnimatePresence>
            {previewImage && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-4"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewImage(null);
                }}
              >
                <img
                  src={previewImage}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}