'use client';

import { forwardRef } from 'react';
import Image from 'next/image';

const PurchaseReceipt = forwardRef(function PurchaseReceipt({ order }, ref) {
  if (!order) return null;

  const items = order.items || [];

  // Items now carry `adjustedAmount` from computeAdjustedItems()
  // (service charge already baked in). Fall back gracefully for old callers.
  const itemsSubtotal = items.reduce((s, i) => {
    if (typeof i.adjustedAmount === 'number') return s + i.adjustedAmount;
    if (typeof i.itemPrice === 'number') return s + i.itemPrice;
    return s + (i.netWeight || 0) * (i.ratePerGram || 0);
  }, 0);

  // What the customer actually receives — the single source of truth
  const netPayable = Number(
    order.finalPrice || order.agentOffer || order.estimatedTotal || 0
  );

  // Total shown on the receipt = adjusted items subtotal, which equals netPayable.
  // Prefer netPayable so any rounding on individual rows doesn't drift the sum.
  const totalPayable = netPayable || itemsSubtotal;

  const totalGross = items.reduce((s, i) => s + (i.grossWeight || 0), 0);
  const totalNet = items.reduce((s, i) => s + (i.netWeight || 0), 0);

  const branchCode = order.branch?.code || 'HO';
  const year = new Date(order.createdAt).getFullYear();
  const shortYear = `${String(year).slice(-2)}-${String(year + 1).slice(-2)}`;
  const invoiceNo = `GC/${branchCode}/${shortYear}/${order.id
    .slice(-4)
    .toUpperCase()}`;
  const receiptDate = new Date(
    order.updatedAt || order.createdAt
  ).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div
      ref={ref}
      id="purchase-receipt"
      className="text-[11px] leading-snug p-6"
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '760px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        color: '#000000',
      }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between pb-3 mb-3"
        style={{ borderBottom: '2px solid #000000' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 relative flex-shrink-0">
            <img
              src="/images/gcentro_logo.png"
              alt="Gold Centro"
              className="w-16 h-16 object-contain"
              crossOrigin="anonymous"
            />
          </div>
          <div>
            <h1
              className="text-xl font-bold tracking-wide"
              style={{ color: '#000000' }}
            >
              Gold Centro
            </h1>
            <p
              className="text-[10px] leading-tight mt-0.5"
              style={{ color: '#374151' }}
            >
              Kalyana Krishna Smskrithibhavan,
              <br />
              BHS Rd, Kannankulangara,
              <br />
              Thrippunithura, Kochi, Kerala 682301
            </p>
          </div>
        </div>
        <div className="text-right" style={{ color: '#000000' }}>
          <p className="font-bold text-sm">PURCHASE RECEIPT</p>
          <p className="text-[10px]">GSTIN: GSTABC123321456</p>
          <p className="text-[10px]">PAN: NA</p>
        </div>
      </div>

      {/* Store + Receipt Details */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div
          className="p-2"
          style={{ border: '1px solid #000000', color: '#000000' }}
        >
          <p className="font-bold mb-1 text-[11px]">Store Details</p>
          <p>
            Branch: <strong>{order.branch?.name || 'Head Office'}</strong>
          </p>
          <p>
            Code: <strong>{branchCode}</strong>
          </p>
          {order.branch?.phone && <p>Phone: {order.branch.phone}</p>}
        </div>
        <div
          className="p-2"
          style={{ border: '1px solid #000000', color: '#000000' }}
        >
          <p className="font-bold mb-1 text-[11px]">Receipt Details</p>
          <p>
            Date: <strong>{receiptDate}</strong>
          </p>
          <p>
            Invoice #: <strong>{invoiceNo}</strong>
          </p>
        </div>
      </div>

      {/* Customer Info */}
      <div
        className="p-2 mb-3"
        style={{ border: '1px solid #000000', color: '#000000' }}
      >
        <p className="font-bold mb-1 text-[11px]">Customer Information</p>
        <p>
          Name: <strong>{order.customer?.name || '—'}</strong>
        </p>
        <p>Mobile: {order.customer?.phone || '—'}</p>
        {order.customer?.aadhaarNumber && (
          <p>Aadhaar: {order.customer.aadhaarNumber}</p>
        )}
      </div>

      {/* Items */}
      <table className="w-full border-collapse mb-2">
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6', color: '#000000' }}>
            <th
              className="px-2 py-1 text-left w-8"
              style={{ border: '1px solid #000000' }}
            >
              #
            </th>
            <th
              className="px-2 py-1 text-left"
              style={{ border: '1px solid #000000' }}
            >
              Item
            </th>
            <th
              className="px-2 py-1 text-right w-14"
              style={{ border: '1px solid #000000' }}
            >
              Count
            </th>
            <th
              className="px-2 py-1 text-right w-20"
              style={{ border: '1px solid #000000' }}
            >
              Net (g)
            </th>
            <th
              className="px-2 py-1 text-right w-20"
              style={{ border: '1px solid #000000' }}
            >
              Rate (₹/g)
            </th>
            <th
              className="px-2 py-1 text-right w-24"
              style={{ border: '1px solid #000000' }}
            >
              Amount (₹)
            </th>
          </tr>
        </thead>
        <tbody style={{ color: '#000000' }}>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan="6"
                className="px-2 py-3 text-center italic"
                style={{ border: '1px solid #000000' }}
              >
                No items recorded
              </td>
            </tr>
          ) : (
            items.map((it, idx) => {
              const net = it.netWeight || 0;
              const rate = it.ratePerGram || 0;
              // Prefer adjustedAmount (service charge already baked in),
              // fall back to raw for legacy orders.
              const amount =
                typeof it.adjustedAmount === 'number'
                  ? it.adjustedAmount
                  : typeof it.itemPrice === 'number'
                  ? it.itemPrice
                  : net * rate;
              return (
                <tr key={it.id || idx}>
                  <td
                    className="px-2 py-1"
                    style={{ border: '1px solid #000000' }}
                  >
                    {idx + 1}
                  </td>
                  <td
                    className="px-2 py-1"
                    style={{ border: '1px solid #000000' }}
                  >
                    {it.name}
                    {it.purity && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 9,
                          color: '#6b7280',
                        }}
                      >
                        ({it.purity})
                      </span>
                    )}
                  </td>
                  <td
                    className="px-2 py-1 text-right"
                    style={{ border: '1px solid #000000' }}
                  >
                    {it.count}
                  </td>
                  <td
                    className="px-2 py-1 text-right"
                    style={{ border: '1px solid #000000' }}
                  >
                    {net.toFixed(2)}
                  </td>
                  <td
                    className="px-2 py-1 text-right"
                    style={{ border: '1px solid #000000' }}
                  >
                    {rate.toFixed(2)}
                  </td>
                  <td
                    className="px-2 py-1 text-right"
                    style={{ border: '1px solid #000000' }}
                  >
                    {amount.toFixed(2)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>

        {/* Footer — service charge no longer shown separately */}
        <tfoot style={{ color: '#000000' }}>
          {/* Totals row */}
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <td
              colSpan="3"
              className="px-2 py-1 text-right font-bold"
              style={{ border: '1px solid #000000' }}
            >
              TOTAL
            </td>
            <td
              className="px-2 py-1 text-right font-bold"
              style={{ border: '1px solid #000000' }}
            >
              {totalNet.toFixed(2)}
            </td>
            <td
              className="px-2 py-1 text-right font-bold"
              style={{ border: '1px solid #000000' }}
            >
              —
            </td>
            <td
              className="px-2 py-1 text-right font-bold"
              style={{ border: '1px solid #000000' }}
            >
              ₹ {totalPayable.toFixed(2)}
            </td>
          </tr>

          {/* Net payable */}
          <tr style={{ backgroundColor: '#fef3c7' }}>
            <td
              colSpan="5"
              className="px-2 py-1 text-right font-bold"
              style={{ border: '1px solid #000000' }}
            >
              NET PAYABLE
            </td>
            <td
              className="px-2 py-1 text-right font-bold"
              style={{ border: '1px solid #000000' }}
            >
              ₹ {totalPayable.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Amount in words */}
      <div className="text-right mb-2 text-[12px]">
        <p className="font-bold">
          Net Payable: ₹ {totalPayable.toFixed(2)}
        </p>
      </div>

      <div className="mb-4">
        <p>
          Amount in words:{' '}
          <strong>
            {numberToWords(Math.round(totalPayable))} Rupees Only
          </strong>
        </p>
      </div>

      {/* Declaration */}
      <div
        className="p-2 mb-6"
        style={{ border: '1px solid #000000', color: '#000000' }}
      >
        <p className="font-bold mb-1 text-[11px]">Declaration & Terms</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>
            Gold purchased is verified for purity and weight in the presence of
            the customer.
          </li>
          <li>
            Payment made in accordance with applicable laws and regulations.
          </li>
          <li>All disputes are subject to the jurisdiction of Ernakulam.</li>
        </ol>
      </div>

      <div className="grid grid-cols-2 gap-8 mt-10">
        <div className="text-center" style={{ color: '#000000' }}>
          <div className="pt-1" style={{ borderTop: '1px solid #000000' }}>
            <p className="font-bold">Authorized Signature (Buyer)</p>
            <p className="text-[10px]" style={{ color: '#6b7280' }}>
              For Gold Centro
            </p>
          </div>
        </div>
        <div className="text-center" style={{ color: '#000000' }}>
          <div className="pt-1" style={{ borderTop: '1px solid #000000' }}>
            <p className="font-bold">Customer Signature (Seller)</p>
            <p className="text-[10px]" style={{ color: '#6b7280' }}>
              {order.customer?.name || ''}
            </p>
          </div>
        </div>
      </div>

      <p
        className="text-center text-[9px] mt-6"
        style={{ color: '#9ca3af' }}
      >
        This is a computer-generated receipt. Generated on{' '}
        {new Date().toLocaleString('en-IN')}
      </p>
    </div>
  );
});

function numberToWords(num) {
  if (!num) return 'Zero';
  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];
  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100)
      return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        ' Hundred' +
        (n % 100 ? ' ' + inWords(n % 100) : '')
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        ' Thousand' +
        (n % 1000 ? ' ' + inWords(n % 1000) : '')
      );
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        ' Lakh' +
        (n % 100000 ? ' ' + inWords(n % 100000) : '')
      );
    return (
      inWords(Math.floor(n / 10000000)) +
      ' Crore' +
      (n % 10000000 ? ' ' + inWords(n % 10000000) : '')
    );
  };
  return inWords(num);
}

export default PurchaseReceipt;