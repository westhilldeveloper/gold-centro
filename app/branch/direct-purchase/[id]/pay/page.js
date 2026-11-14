// app/branch/direct-purchase/[id]/pay/page.js
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import {
  CheckCircleIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const PAYMENT_MODES = [
  {
    value: 'CASH',
    label: 'Cash',
    description: 'Deducts from branch ledger',
    Icon: BanknotesIcon,
    color: 'green',
  },
  {
    value: 'BANK_TRANSFER',
    label: 'Bank Transfer',
    description: 'NEFT / IMPS / RTGS',
    Icon: BuildingLibraryIcon,
    color: 'blue',
  },
  {
    value: 'UPI',
    label: 'UPI',
    description: 'Instant UPI transfer',
    Icon: CreditCardIcon,
    color: 'purple',
  },
  {
    value: 'CHEQUE',
    label: 'Cheque',
    description: 'Physical cheque issued',
    Icon: DocumentTextIcon,
    color: 'amber',
  },
];

export default function PaymentPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Payment state
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [reference, setReference] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    accountNo: '',
    ifsc: '',
    bankName: '',
  });
  const [upiDetails, setUpiDetails] = useState({ upiId: '' });
  const [chequeDetails, setChequeDetails] = useState({
    chequeNo: '',
    bankName: '',
    chequeDate: new Date().toISOString().split('T')[0],
  });
  const [saveCustomerBank, setSaveCustomerBank] = useState(true);

  // ───────── Load order ─────────
  useEffect(() => {
    fetch(`/api/branch/direct-purchase/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error);
        setOrder(d.order);
        // Pre-fill customer bank details if they exist
        if (d.order.customer?.bankAccountNo) {
          setBankDetails({
            accountName: d.order.customer.bankAccountName || '',
            accountNo: d.order.customer.bankAccountNo || '',
            ifsc: d.order.customer.bankIfsc || '',
            bankName: d.order.customer.bankName || '',
          });
        }
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const updateBank = (k, v) => setBankDetails((p) => ({ ...p, [k]: v }));
  const updateCheque = (k, v) => setChequeDetails((p) => ({ ...p, [k]: v }));

  // ───────── Get dynamic reference label per mode ─────────
  const referenceLabel = {
    CASH: 'Reference / Remark (optional)',
    BANK_TRANSFER: 'UTR / Transaction ID (optional — required with gateway)',
    UPI: 'UPI UTR / Reference (optional)',
    CHEQUE: 'Receipt / Voucher No. (optional)',
  }[paymentMode];

  // ───────── Submit ─────────
  const handlePay = async () => {
    // Basic client-side validation (server re-validates)
    if (paymentMode === 'BANK_TRANSFER') {
      if (!bankDetails.accountName || !bankDetails.accountNo || !bankDetails.ifsc) {
        return toast.error('Please fill account holder name, account number, and IFSC');
      }
    }
    if (paymentMode === 'UPI' && !upiDetails.upiId) {
      return toast.error('Please enter the customer UPI ID');
    }
    if (paymentMode === 'CHEQUE') {
      if (!chequeDetails.chequeNo || !chequeDetails.bankName || !chequeDetails.chequeDate) {
        return toast.error('Please fill cheque number, bank name, and cheque date');
      }
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/branch/direct-purchase/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMode,
          reference: reference.trim() || null,
          bankDetails: paymentMode === 'BANK_TRANSFER' ? bankDetails : null,
          upiDetails: paymentMode === 'UPI' ? upiDetails : null,
          chequeDetails: paymentMode === 'CHEQUE' ? chequeDetails : null,
          saveCustomerBank: paymentMode === 'BANK_TRANSFER' && saveCustomerBank,
          createdBy: user.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Payment complete. Items added to branch stock.');
      router.push('/branch/stock');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-red-50 border border-red-200 p-6 rounded-2xl text-center text-red-700">
        Order not found.
      </div>
    );
  }

  const customer = order.customer || {};
  const showSaveBankCheckbox =
    paymentMode === 'BANK_TRANSFER' && !customer.bankAccountNo;

  return (
    <div className="max-w-xl mx-auto mt-10 space-y-5 p-4 pb-12">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border-t-4 border-green-500">
        <h1 className="text-2xl font-bold text-gray-900 text-center">Final Payment</h1>
        <p className="text-sm text-gray-500 mt-1 text-center">
          Order #{order.id.slice(-8).toUpperCase()}
        </p>

        {/* Amount summary */}
        <div className="mt-6 bg-gray-50 p-5 rounded-2xl border text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            Pay to customer
          </p>
          <p className="text-4xl font-bold text-green-700 mt-1">
            ₹ {order.finalPrice?.toFixed(2)}
          </p>
          <div className="mt-3 text-sm text-gray-600">
            <p className="font-medium">{customer.name}</p>
            <p className="text-xs text-gray-500">{customer.phone}</p>
          </div>
        </div>
      </div>

      {/* Payment mode selection */}
      <div className="bg-white p-5 rounded-2xl shadow-md">
        <p className="text-sm font-semibold text-gray-700 mb-3">Payment Mode</p>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setPaymentMode(m.value)}
              type="button"
              className={`p-3 rounded-xl border-2 transition text-left ${
                paymentMode === m.value
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <m.Icon
                className={`w-5 h-5 mb-1 ${
                  paymentMode === m.value ? 'text-yellow-700' : 'text-gray-500'
                }`}
              />
              <p className="text-sm font-semibold text-gray-900">{m.label}</p>
              <p className="text-[10px] text-gray-500">{m.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Mode-specific fields ── */}
      {paymentMode === 'BANK_TRANSFER' && (
        <div className="bg-white p-5 rounded-2xl shadow-md space-y-3">
          <p className="text-sm font-semibold text-gray-700">Customer Bank Details</p>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Account Holder Name *</label>
            <input
              type="text"
              value={bankDetails.accountName}
              onChange={(e) => updateBank('accountName', e.target.value)}
              placeholder="As per bank records"
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-yellow-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Account Number *</label>
              <input
                type="text"
                value={bankDetails.accountNo}
                onChange={(e) => updateBank('accountNo', e.target.value.replace(/\s/g, ''))}
                placeholder="Bank account number"
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-yellow-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">IFSC Code *</label>
              <input
                type="text"
                value={bankDetails.ifsc}
                onChange={(e) => updateBank('ifsc', e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                maxLength={11}
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-yellow-500 outline-none font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Bank Name (optional)</label>
            <input
              type="text"
              value={bankDetails.bankName}
              onChange={(e) => updateBank('bankName', e.target.value)}
              placeholder="e.g. HDFC Bank"
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-yellow-500 outline-none"
            />
          </div>

          {showSaveBankCheckbox && (
            <label className="flex items-start gap-2 text-xs text-gray-600 pt-1">
              <input
                type="checkbox"
                checked={saveCustomerBank}
                onChange={(e) => setSaveCustomerBank(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-yellow-500"
              />
              <span>
                Save these bank details to the customer's profile for future
                transactions.
              </span>
            </label>
          )}
        </div>
      )}

      {paymentMode === 'UPI' && (
        <div className="bg-white p-5 rounded-2xl shadow-md space-y-3">
          <p className="text-sm font-semibold text-gray-700">UPI Details</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Customer UPI ID *</label>
            <input
              type="text"
              value={upiDetails.upiId}
              onChange={(e) => setUpiDetails({ upiId: e.target.value.trim() })}
              placeholder="e.g. name@okhdfcbank"
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-yellow-500 outline-none"
            />
          </div>
          <p className="text-[11px] text-gray-500 italic">
            Transfer via UPI outside the app, then record the reference below.
          </p>
        </div>
      )}

      {paymentMode === 'CHEQUE' && (
        <div className="bg-white p-5 rounded-2xl shadow-md space-y-3">
          <p className="text-sm font-semibold text-gray-700">Cheque Details</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cheque Number *</label>
              <input
                type="text"
                value={chequeDetails.chequeNo}
                onChange={(e) => updateCheque('chequeNo', e.target.value)}
                placeholder="6-digit cheque number"
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-yellow-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cheque Date *</label>
              <input
                type="date"
                value={chequeDetails.chequeDate}
                onChange={(e) => updateCheque('chequeDate', e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-yellow-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Cheque Bank Name *</label>
            <input
              type="text"
              value={chequeDetails.bankName}
              onChange={(e) => updateCheque('bankName', e.target.value)}
              placeholder="e.g. State Bank of India"
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-yellow-500 outline-none"
            />
          </div>
        </div>
      )}

      {/* ── Reference (always visible) ── */}
      <div className="bg-white p-5 rounded-2xl shadow-md">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {referenceLabel}
        </label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={
            paymentMode === 'CASH'
              ? 'e.g. Paid in person, note #42'
              : paymentMode === 'BANK_TRANSFER'
              ? 'e.g. UTR123456789012'
              : paymentMode === 'UPI'
              ? 'e.g. 123456789012'
              : 'e.g. Internal receipt #'
          }
          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-yellow-500 outline-none"
        />
        <p className="text-[11px] text-gray-500 mt-1">
          Stored with the order for audit purposes.
        </p>
      </div>

      {/* Cash mode warning */}
      {paymentMode === 'CASH' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-semibold">This will deduct from branch cash</p>
            <p className="mt-1">
              ₹{order.finalPrice?.toFixed(2)} will be debited from your branch
              ledger. Make sure you have enough balance.
            </p>
          </div>
        </div>
      )}

      {/* Future gateway callout (non-cash modes) */}
      {paymentMode !== 'CASH' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800">
            <p className="font-semibold">Manual mode</p>
            <p className="mt-1">
              Complete the transfer / cheque outside the app, then confirm here.
              Once the bank API is live, this step will initiate the transfer
              automatically.
            </p>
          </div>
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={handlePay}
        disabled={processing}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <CheckCircleIcon className="w-5 h-5" />
        {processing
          ? 'Processing...'
          : paymentMode === 'CHEQUE'
          ? 'Confirm Cheque Issued'
          : 'Confirm Payment'}
      </button>
    </div>
  );
}