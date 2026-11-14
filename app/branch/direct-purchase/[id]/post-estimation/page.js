// D:\gold-centro\app\branch\direct-purchase\[id]\post-estimation\page.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import {
  FireIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export default function PostEstimationPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [goldRate, setGoldRate] = useState(null);
  const [finalPrice, setFinalPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingRates, setFetchingRates] = useState(false);

  // ─────────────────────────────────────────────
  // 1. Fetch the latest live gold rate
  // ─────────────────────────────────────────────
  const fetchRates = useCallback(async (silent = false) => {
    setFetchingRates(true);
    try {
      const res = await fetch('/api/rates/current');
      const data = await res.json();
      if (data.success && data.rate?.rates) {
        setGoldRate(data.rate);
        if (!silent) toast.success('Live rates updated');
        return data.rate;
      } else {
        if (!silent) toast.error('Admin has not configured gold rates');
        return null;
      }
    } catch (err) {
      if (!silent) toast.error('Failed to fetch rates');
      return null;
    } finally {
      setFetchingRates(false);
    }
  }, []);

  // ─────────────────────────────────────────────
  // 2. Load order details + rate on mount
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/branch/direct-purchase/${id}`).then((r) => r.json()),
      fetch('/api/rates/current').then((r) => r.json()).catch(() => ({})),
    ])
      .then(([orderRes, rateRes]) => {
        if (!orderRes.success) throw new Error(orderRes.error || 'Order not found');
        setOrder(orderRes.order);

        // Initialize items with existing post-est data (or blanks)
        const initItems = orderRes.order.items.map((it) => ({
          id: it.id,
          name: it.name,
          purity: it.purity,
          count: it.count,
          preEstimationGrossWeight: it.preEstimationGrossWeight,
          // Post-estimation fields (pre-fill if already set)
          grossWeight: it.grossWeight || '',
          stoneWeight: it.stoneWeight || '',
          dustWeight: it.dustWeight || '',
          netWeight: it.netWeight || '',
          ratePerGram: it.ratePerGram || '',
          itemPrice: it.itemPrice || '',
        }));

        if (rateRes.success && rateRes.rate?.rates) {
          setGoldRate(rateRes.rate);
          // Auto-fill rate for items that don't have one yet
          const withRates = initItems.map((it) => {
            if (!it.ratePerGram) {
              const r = rateRes.rate.rates[it.purity] || 0;
              const net = parseFloat(it.netWeight) || 0;
              return {
                ...it,
                ratePerGram: r,
                itemPrice: (net * r).toFixed(2),
              };
            }
            return it;
          });
          setItems(withRates);
        } else {
          setItems(initItems);
        }

        if (orderRes.order.finalPrice > 0) {
          setFinalPrice(String(orderRes.order.finalPrice));
        }
      })
      .catch((err) => {
        toast.error(err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ─────────────────────────────────────────────
  // 3. When rates load/change, update items missing a rate
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!goldRate?.rates) return;
    setItems((prev) =>
      prev.map((item) => {
        // Only auto-fill if the rate is empty (don't override manual entries)
        if (!item.ratePerGram) {
          const r = goldRate.rates[item.purity] || 0;
          const net = parseFloat(item.netWeight) || 0;
          return {
            ...item,
            ratePerGram: r,
            itemPrice: net > 0 ? (net * r).toFixed(2) : '',
          };
        }
        return item;
      })
    );
  }, [goldRate]);

  // ─────────────────────────────────────────────
  // 4. Update item — recalculate net & price
  // ─────────────────────────────────────────────
  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = { ...newItems[index] };
      item[field] = value;

      // If purity changed, update rate to match the new purity
      if (field === 'purity' && goldRate?.rates) {
        const newRate = goldRate.rates[value] || 0;
        item.ratePerGram = newRate;
      }

      // Recalculate net weight and item price
      if (
        ['grossWeight', 'stoneWeight', 'dustWeight', 'ratePerGram', 'purity'].includes(field)
      ) {
        const g = parseFloat(item.grossWeight) || 0;
        const s = parseFloat(item.stoneWeight) || 0;
        const d = parseFloat(item.dustWeight) || 0;
        const r = parseFloat(item.ratePerGram) || 0;
        const net = Math.max(0, g - s - d);

        item.netWeight = net.toFixed(2);
        item.itemPrice = (net * r).toFixed(2);
      }

      newItems[index] = item;
      return newItems;
    });
  };

  const calculateTotal = () =>
    items.reduce((sum, item) => sum + (parseFloat(item.itemPrice) || 0), 0).toFixed(2);

  const handleSubmit = async () => {
    if (items.some((i) => !i.netWeight || parseFloat(i.netWeight) <= 0)) {
      return toast.error('All items must have a valid net weight');
    }
    if (items.some((i) => !i.ratePerGram || parseFloat(i.ratePerGram) <= 0)) {
      return toast.error('All items must have a valid rate');
    }

    const finalAmt = parseFloat(finalPrice) || parseFloat(calculateTotal());

    setSubmitting(true);
    try {
      const res = await fetch(`/api/branch/direct-purchase/${id}/post-estimation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, finalPrice: finalAmt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Post-estimation saved.  Proceeding to Final Agreement...');
      router.push(`/branch/direct-purchase/${id}/agreement`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────
  // 5. Render
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-red-50 border border-red-200 p-6 rounded-2xl text-center">
        <p className="font-bold text-red-700">Order not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 p-4">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <FireIcon className="w-7 h-7 text-orange-600" />
            Post-Estimation
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            After cleaning/melting of Order #{order.id.slice(-8).toUpperCase()}
          </p>
        </div>

        {/* Live rate display + refresh */}
        {goldRate && (
          <div className="flex items-center gap-2 text-sm bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-200">
            <span className="text-gray-500">Live Rate:</span>
            {Object.entries(goldRate.rates).map(([k, v]) => (
              <span key={k} className="font-bold text-yellow-800">
                {k}: ₹{v}
              </span>
            ))}
            <button
              onClick={() => fetchRates(false)}
              disabled={fetchingRates}
              className="ml-1 text-gray-400 hover:text-yellow-600 disabled:opacity-50"
              title="Refresh rates"
            >
              <ArrowPathIcon className={`w-4 h-4 ${fetchingRates ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Items */}
      {items.map((item, idx) => (
        <div
          key={item.id}
          className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4"
        >
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900">
                {item.name}{' '}
                <span className="text-xs text-gray-500 font-normal">
                  ({item.purity} · {item.count} pcs)
                </span>
              </h3>
              <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold">
                Pre-Gross: {item.preEstimationGrossWeight || 0}g
              </span>
            </div>
            {item.itemPrice > 0 && (
              <span className="text-sm font-bold text-green-700">
                ₹ {parseFloat(item.itemPrice).toFixed(2)}
              </span>
            )}
          </div>

          {/* Purity selector (in case staff needs to adjust) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">
                Final Purity
              </label>
              <select
                value={item.purity}
                onChange={(e) => updateItem(idx, 'purity', e.target.value)}
                className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:border-yellow-500 outline-none font-bold"
              >
                {goldRate?.rates &&
                  Object.keys(goldRate.rates).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                {!goldRate?.rates && (
                  <>
                    <option value="24K">24K</option>
                    <option value="22K">22K</option>
                    <option value="18K">18K</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">
                Rate (₹/g) — Auto-filled
              </label>
              <input
                type="number"
                step="0.01"
                value={item.ratePerGram}
                onChange={(e) => updateItem(idx, 'ratePerGram', e.target.value)}
                className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:border-yellow-500 outline-none font-medium bg-yellow-50"
              />
            </div>
          </div>

          {/* Weight inputs */}
          <div className="bg-green-50 border border-green-100 rounded-xl p-3">
            <p className="text-[10px] text-green-800 uppercase font-bold mb-2">
              Post-Cleaning / Melting Weights
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Gross (g)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={item.grossWeight}
                  onChange={(e) => updateItem(idx, 'grossWeight', e.target.value)}
                  className="border rounded-lg px-2 py-2 text-sm w-full focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Stone (g)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={item.stoneWeight}
                  onChange={(e) => updateItem(idx, 'stoneWeight', e.target.value)}
                  className="border rounded-lg px-2 py-2 text-sm w-full focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Dust (g)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={item.dustWeight}
                  onChange={(e) => updateItem(idx, 'dustWeight', e.target.value)}
                  className="border rounded-lg px-2 py-2 text-sm w-full focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-green-700 font-bold block mb-1">
                  Net (g)
                </label>
                <div className="border-2 border-green-200 bg-white rounded-lg px-2 py-2 text-sm font-bold text-green-700 text-center">
                  {item.netWeight || '0.00'}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Grand Total */}
      <div className="bg-gray-900 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Calculated Total
          </p>
          <p className="text-3xl font-bold text-yellow-400 mt-1">₹ {calculateTotal()}</p>
        </div>
        <div className="text-xs text-gray-400 text-right">
          <p>Based on current live rates</p>
          <p>for {items.length} item{items.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Final Price Override */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Final Override Price (Optional)
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Leave blank to use the calculated total. Enter a custom value only if
          you need to adjust the final amount.
        </p>
        <input
          type="number"
          step="0.01"
          value={finalPrice}
          onChange={(e) => setFinalPrice(e.target.value)}
          placeholder={calculateTotal()}
          className="w-full border-2 border-yellow-300 rounded-xl px-4 py-3 font-bold text-lg focus:border-yellow-500 outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => router.back()}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 rounded-xl"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <CheckCircleIcon className="w-5 h-5" />
          {submitting ? 'Saving...' : 'Confirm & Proceed to Payment'}
        </button>
      </div>
    </div>
  );
}