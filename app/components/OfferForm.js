'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import PostEstimationDocument from './PostEstimationDocument';
import { downloadPostEstimation } from '../../lib/downloadPostEstimation';

const ITEM_NAMES = ['Ring', 'Bangle', 'Chain', 'Necklace', 'Earring', 'Bracelet', 'Coin', 'Bar', 'Other'];
const PAYMENT_MODES = [
  { value: 'CASH', label: '💵 Cash' },
  { value: 'UPI', label: '📱 UPI' },
  { value: 'BANK_TRANSFER', label: '🏦 Bank Transfer' },
  { value: 'CHEQUE', label: '📝 Cheque' },
];

// Safe number coercion
const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
  return data.secure_url;
}

export default function OfferForm({ orderId, order, onSendOffer, sending }) {
  const [rate, setRate] = useState(null);
  const [paymentMode, setPaymentMode] = useState(order.paymentMode || 'CASH');
  const [price, setPrice] = useState('');
  const priceTouchedRef = useRef(false);

  const [items, setItems] = useState(
    order.items?.length > 0
      ? order.items.map((i) => ({
          ...i,
          purity: i.purity || '24K',
          imageUrls: i.imageUrls || [],
          stoneWeight: i.stoneWeight || 0,
          dustWeight: i.dustWeight || 0,
        }))
      : [emptyItem()]
  );

  // Pledge state
  const [isPledged, setIsPledged] = useState(!!order.isPledged);
  const [bankName, setBankName] = useState(order.pledgeBankName || '');
  const [loanAccountNo, setLoanAccountNo] = useState(order.pledgeLoanAccountNo || '');
  const [outstandingAmount, setOutstandingAmount] = useState(
    order.pledgeOutstandingAmount != null ? String(order.pledgeOutstandingAmount) : ''
  );

  // Post-Estimation download
  const postEstimationRef = useRef(null);
  const [showPostEstimation, setShowPostEstimation] = useState(false);
  const [downloading, setDownloading] = useState(false);

  function emptyItem() {
    return {
      name: 'Ring',
      count: 1,
      purity: '24K',
      imageUrls: [],
      grossWeight: '',
      stoneWeight: '',
      dustWeight: '',
      netWeight: '',
    };
  }

  useEffect(() => {
    fetch('/api/rates/current')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRate(d.rate);
      })
      .catch(() => {});
  }, []);

  // ---- Helpers ----
  const computeNet = (it) => {
    const g = num(it.grossWeight);
    const s = num(it.stoneWeight);
    const d = num(it.dustWeight);
    return Math.max(0, g - s - d);
  };

  const availableKarats = rate ? Object.keys(rate.rates || {}) : ['24K', '22K'];
  const servicePct = rate?.serviceChargePercent || 0;

  const totalGross = items.reduce((s, it) => s + num(it.grossWeight), 0);
  const totalStone = items.reduce((s, it) => s + num(it.stoneWeight), 0);
  const totalDust = items.reduce((s, it) => s + num(it.dustWeight), 0);
  const totalNet = items.reduce((s, it) => s + computeNet(it), 0);
  const totalCount = items.reduce((s, it) => s + num(it.count, 1), 0);

  const purityGroups = useMemo(() => {
    const groups = {};
    items.forEach((it) => {
      const p = it.purity || '24K';
      if (!groups[p]) groups[p] = { purity: p, net: 0, gross: 0, count: 0, subtotal: 0 };
      const net = computeNet(it);
      const ratePerG = rate?.rates?.[p] || 0;
      groups[p].net += net;
      groups[p].gross += num(it.grossWeight);
      groups[p].count += num(it.count, 1);
      groups[p].subtotal += net * ratePerG;
    });
    Object.values(groups).forEach((g) => {
      g.ratePerG = rate?.rates?.[g.purity] || 0;
      g.service = (g.subtotal * servicePct) / 100;
      g.total = Math.max(0, g.subtotal - g.service);
    });
    return Object.values(groups);
  }, [items, rate, servicePct]);

  const subtotal = purityGroups.reduce((s, g) => s + g.subtotal, 0);
  const serviceCharge = purityGroups.reduce((s, g) => s + g.service, 0);
  const suggestedOffer = Math.max(0, subtotal - serviceCharge);

  useEffect(() => {
    if (priceTouchedRef.current) return;
    setPrice(suggestedOffer > 0 ? suggestedOffer.toFixed(2) : '');
  }, [suggestedOffer]);

  useEffect(() => {
    priceTouchedRef.current = false;
  }, [orderId]);

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));
  const updateItem = (index, patch) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  // Build a *clean* order for the doc — all numeric fields coerced
  const buildDocOrder = () => ({
    ...order,
    items: items.map((it) => {
      const net = computeNet(it);
      const ratePerG = num(rate?.rates?.[it.purity]);
      return {
        ...it,
        count: num(it.count, 1),
        grossWeight: num(it.grossWeight),
        stoneWeight: num(it.stoneWeight),
        dustWeight: num(it.dustWeight),
        netWeight: net,
        ratePerGram: ratePerG,
        itemPrice: net * ratePerG,
        purity: it.purity || '24K',
        name: it.name || 'Other',
      };
    }),
    isPledged,
    pledgeBankName: isPledged ? bankName : null,
    pledgeLoanAccountNo: isPledged ? loanAccountNo : null,
    pledgeOutstandingAmount: isPledged ? num(outstandingAmount) : null,
    serviceChargePercent: num(servicePct),
    serviceChargeAmount: num(serviceCharge),
    agentOffer: num(price),
  });

  useEffect(() => {
    if (!showPostEstimation) return;
    const run = async () => {
      await new Promise((r) => requestAnimationFrame(r));
      if (!postEstimationRef.current) return;
      setDownloading(true);
      try {
        await downloadPostEstimation(postEstimationRef.current, buildDocOrder());
        toast.success(
          isPledged ? 'Pledged Post-Estimation downloaded' : 'Post-Estimation downloaded'
        );
      } catch (err) {
        toast.error('Download failed: ' + err.message);
      } finally {
        setDownloading(false);
        setShowPostEstimation(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPostEstimation]);

  const handleDownload = () => {
    if (isPledged && (!bankName.trim() || !loanAccountNo.trim() || outstandingAmount === '')) {
      toast.error('Fill bank, loan A/c and outstanding amount before downloading');
      return;
    }
    setShowPostEstimation(true);
  };

  const handleSubmit = () => {
    if (items.length === 0) return toast.error('Add at least one item');
    for (let i = 0; i < items.length; i++) {
      if (computeNet(items[i]) <= 0) {
        toast.error(`Item ${i + 1}: net weight must be > 0`);
        return;
      }
    }
    if (!price || parseFloat(price) <= 0) {
      toast.error('Enter a valid offer price');
      return;
    }
    if (isPledged && (!bankName.trim() || !loanAccountNo.trim() || outstandingAmount === '')) {
      toast.error('Fill bank, loan A/c and outstanding amount for pledged gold');
      return;
    }

    const itemsForApi = items.map((it) => {
      const net = computeNet(it);
      const itemRate = num(rate?.rates?.[it.purity]);
      return {
        name: it.name,
        count: parseInt(it.count) || 1,
        purity: it.purity || '24K',
        imageUrls: it.imageUrls || [],
        grossWeight: num(it.grossWeight),
        stoneWeight: num(it.stoneWeight),
        dustWeight: num(it.dustWeight),
        netWeight: net,
        ratePerGram: itemRate,
        itemPrice: net * itemRate,
      };
    });

    const orderPurity = purityGroups.length === 1 ? purityGroups[0].purity : 'MIXED';

    onSendOffer(orderId, totalNet.toFixed(2), orderPurity, price, paymentMode, itemsForApi, {
      isPledged,
      pledgeBankName: isPledged ? bankName.trim() : null,
      pledgeLoanAccountNo: isPledged ? loanAccountNo.trim() : null,
      pledgeOutstandingAmount: isPledged ? num(outstandingAmount) : null,
    });
  };

  return (
    <div className="space-y-4 bg-gray-50 p-4 rounded-xl">
      {/* Payment Mode */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">Payment Mode</label>
        <select
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-yellow-400 outline-none"
        >
          {PAYMENT_MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Pledge Section */}
      <div
        className={`rounded-xl border-2 p-3 space-y-2 transition ${
          isPledged ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-white'
        }`}
      >
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isPledged}
            onChange={(e) => setIsPledged(e.target.checked)}
            className="w-4 h-4 accent-rose-600"
          />
          <span className="text-sm font-semibold text-gray-800">
            🔒 Gold is pledged with a bank / NBFC
          </span>
        </label>
        <p className="text-[10px] text-gray-500">
          Tick if the customer's gold is currently pledged. Enables the pledged-release clause in the Post-Estimation document.
        </p>

        {isPledged && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
            <input
              type="text"
              placeholder="Bank / NBFC name"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-rose-500 outline-none"
            />
            <input
              type="text"
              placeholder="Loan / Pledge A/c No."
              value={loanAccountNo}
              onChange={(e) => setLoanAccountNo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-rose-500 outline-none"
            />
            <input
              type="number"
              placeholder="Outstanding ₹"
              value={outstandingAmount}
              onChange={(e) => setOutstandingAmount(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-rose-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* Items */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-gray-500 font-medium">
            Items ({items.length}) • {totalCount} pcs
          </label>
          <button
            onClick={addItem}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
          >
            <PlusIcon className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => (
            <ItemRow
              key={index}
              item={item}
              index={index}
              total={items.length}
              availableKarats={availableKarats}
              rates={rate?.rates || {}}
              computeNet={computeNet}
              onUpdate={(patch) => updateItem(index, patch)}
              onRemove={() => removeItem(index)}
            />
          ))}
        </div>
      </div>

      {/* Purity Breakdown */}
      {purityGroups.length > 0 && (
        <div className="bg-white rounded-xl p-3 border border-gray-200 space-y-2">
          <p className="text-xs font-semibold text-gray-700">Breakdown by Purity</p>
          {purityGroups.map((g) => (
            <div key={g.purity} className="bg-gray-50 rounded-lg p-2 text-xs space-y-1">
              <div className="flex justify-between font-semibold text-gray-800">
                <span>{g.purity} ({g.count} pcs)</span>
                <span>{g.net.toFixed(2)} g</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Rate: ₹{g.ratePerG.toFixed(2)}/g</span>
                <span>₹{g.subtotal.toFixed(2)}</span>
              </div>
              {servicePct > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Service ({servicePct}%)</span>
                  <span>− ₹{g.service.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-yellow-700 border-t border-gray-200 pt-1">
                <span>Subtotal</span>
                <span>₹{g.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <div className="bg-white rounded-xl p-3 border border-gray-200 space-y-2 text-sm">
        <Row label="Total Gross" value={`${totalGross.toFixed(2)} g`} />
        <Row label="Total Stone" value={`− ${totalStone.toFixed(2)} g`} muted />
        <Row label="Total Dust/Wastage" value={`− ${totalDust.toFixed(2)} g`} muted />
        <Row label="Total Net" value={`${totalNet.toFixed(2)} g`} bold />
        <div className="border-t border-gray-200 my-1" />
        <Row label="Subtotal" value={`₹ ${subtotal.toFixed(2)}`} />
        <Row label={`Service Charge (${servicePct}%)`} value={`− ₹ ${serviceCharge.toFixed(2)}`} muted />
        <div className="border-t border-gray-200 my-1" />
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-800">Suggested Offer</span>
          <span className="font-bold text-lg text-yellow-700">₹ {suggestedOffer.toFixed(2)}</span>
        </div>
      </div>

      {/* Final Offer */}
      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          Final Offer (₹) — editable
        </label>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => {
              priceTouchedRef.current = true;
              setPrice(e.target.value);
            }}
            className="w-full border-2 border-yellow-300 rounded-lg px-3 py-2 text-sm font-semibold focus:border-yellow-500 outline-none"
          />
          {priceTouchedRef.current && (
            <button
              onClick={() => {
                priceTouchedRef.current = false;
                setPrice(suggestedOffer.toFixed(2));
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-600 hover:text-blue-800 font-medium bg-white px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Download Post-Estimation */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="w-full bg-white border-2 border-blue-300 text-blue-700 font-medium py-2.5 rounded-lg hover:bg-blue-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <DocumentDuplicateIcon className="w-4 h-4" />
        {downloading
          ? 'Preparing PDF…'
          : isPledged
          ? '📄 Download Pledged Post-Estimation'
          : '📄 Download Post-Estimation'}
      </button>

      <button
        onClick={handleSubmit}
        disabled={sending}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {sending ? 'Sending...' : 'Send Offer to Admin'}
      </button>

      {showPostEstimation && (
        <div
          aria-hidden="true"
          style={{ position: 'fixed', left: '-10000px', top: 0, pointerEvents: 'none' }}
        >
          <PostEstimationDocument
            ref={postEstimationRef}
            order={buildDocOrder()}
            forcePledged={isPledged}
          />
        </div>
      )}
    </div>
  );
}

function Row({ label, value, muted, bold }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? 'text-gray-500' : bold ? 'font-semibold text-gray-800' : 'text-gray-600'}>
        {label}
      </span>
      <span className={muted ? 'text-gray-500' : bold ? 'font-bold text-gray-900' : 'text-gray-700'}>
        {value}
      </span>
    </div>
  );
}

// ============================
// Item Row
// ============================
function ItemRow({ item, index, total, availableKarats, rates, computeNet, onUpdate, onRemove }) {
  const [uploading, setUploading] = useState(false);
  const net = computeNet(item);
  const ratePerG = rates[item.purity] || 0;
  const itemValue = net * ratePerG;

  const handleImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const url = await uploadToCloudinary(file);
        urls.push(url);
      }
      onUpdate({ imageUrls: [...(item.imageUrls || []), ...urls] });
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url) => {
    onUpdate({ imageUrls: (item.imageUrls || []).filter((u) => u !== url) });
  };

  return (
    <div className="bg-white rounded-xl p-3 border border-gray-200 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-400 w-6">#{index + 1}</span>
        <select
          value={item.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:border-yellow-400 outline-none"
        >
          {ITEM_NAMES.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <select
          value={item.purity}
          onChange={(e) => onUpdate({ purity: e.target.value })}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:border-yellow-400 outline-none font-semibold"
        >
          {availableKarats.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        {total > 1 && (
          <button
            onClick={onRemove}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="block text-[10px] text-gray-500 font-medium mb-0.5">Count</label>
          <input
            type="number"
            min="1"
            value={item.count}
            onChange={(e) => onUpdate({ count: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:border-yellow-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 font-medium mb-0.5">Gross (g)</label>
          <input
            type="number"
            step="0.01"
            value={item.grossWeight}
            onChange={(e) => onUpdate({ grossWeight: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:border-yellow-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 font-medium mb-0.5">Stone (g)</label>
          <input
            type="number"
            step="0.01"
            value={item.stoneWeight}
            onChange={(e) => onUpdate({ stoneWeight: e.target.value })}
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:border-yellow-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 font-medium mb-0.5">Dust (g)</label>
          <input
            type="number"
            step="0.01"
            value={item.dustWeight}
            onChange={(e) => onUpdate({ dustWeight: e.target.value })}
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:border-yellow-400 outline-none"
          />
        </div>
      </div>

      <div className="flex justify-between items-center text-xs bg-gray-50 rounded-lg px-3 py-1.5">
        <span className="text-gray-500">
          Net: <strong className="text-yellow-700">{net.toFixed(2)} g</strong>
        </span>
        <span className="text-gray-500">
          {item.purity} @ ₹{ratePerG}/g ={' '}
          <strong className="text-green-700">₹ {itemValue.toFixed(2)}</strong>
        </span>
      </div>

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          {(item.imageUrls || []).map((url, i) => (
            <div key={url} className="relative w-16 h-16">
              <img
                src={url}
                alt={`item-${index}-${i}`}
                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={() => removeImage(url)}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          ))}

          <label className="flex items-center gap-1.5 text-xs text-gray-500 border-2 border-dashed border-gray-300 rounded-lg px-3 py-3 cursor-pointer hover:border-yellow-400">
            <PhotoIcon className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Add Photo'}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImages}
              disabled={uploading}
            />
          </label>
        </div>
      </div>
    </div>
  );
}