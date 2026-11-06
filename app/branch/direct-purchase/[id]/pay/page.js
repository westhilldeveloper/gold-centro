'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export default function PaymentPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMode, setPaymentMode] = useState('CASH');

  useEffect(() => {
    fetch(`/api/branch/direct-purchase/${id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setOrder(d.order); })
      .finally(() => setLoading(false));
  }, [id]);

  const handlePay = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/branch/direct-purchase/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMode, createdBy: user.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Payment complete! Items added to stock.');
      router.push('/branch/stock');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!order) return <div className="p-12 text-red-500">Order not found.</div>;

  return (
    <div className="max-w-md mx-auto mt-10 space-y-6">
      <Toaster position="top-center" />
      <div className="bg-white p-8 rounded-3xl shadow-lg border-t-4 border-green-500 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Final Payment</h1>
        <p className="text-sm text-gray-500 mt-1">Agreement signed for #{order.id.slice(-8).toUpperCase()}</p>

        <div className="mt-6 bg-gray-50 p-6 rounded-2xl border">
          <p className="text-sm text-gray-500 mb-1">Total Payable to Customer</p>
          <p className="text-4xl font-bold text-green-700 mb-6">₹ {order.finalPrice?.toFixed(2)}</p>
          
          <div className="text-left">
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
            <select 
              value={paymentMode} 
              onChange={e => setPaymentMode(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-xl p-3 outline-none focus:border-green-500"
            >
              <option value="CASH">Cash (Deducts from Branch Ledger)</option>
              <option value="UPI">UPI / Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
        </div>

        <button 
          onClick={handlePay} 
          disabled={processing}
          className="mt-8 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {processing ? 'Processing...' : <><CheckCircleIcon className="w-5 h-5"/> Confirm & Transfer Funds</>}
        </button>
      </div>
    </div>
  );
}