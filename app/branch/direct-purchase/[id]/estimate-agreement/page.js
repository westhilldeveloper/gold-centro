// app/branch/direct-purchase/[id]/estimate-agreement/page.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { DocumentArrowUpIcon, PrinterIcon } from '@heroicons/react/24/outline';
import EstimateAgreement from '../../../../components/EstimateAgreement';
import { downloadPostEstimation as downloadPDF } from '../../../../../lib/downloadPostEstimation';

export default function EstimateAgreementPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/branch/direct-purchase/${id}`, { credentials: 'include' })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
        if (!json.success) throw new Error(json.error || 'API returned failure');
        setData(json);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = async () => {
    if (!pdfRef.current) return;
    const t = toast.loading('Generating PDF...');
    try {
      await downloadPDF(pdfRef.current, data.order);
      toast.success('Downloaded', { id: t });
    } catch (err) {
      toast.error('Failed: ' + err.message, { id: t });
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const t = toast.loading('Uploading...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: 'POST', body: formData }
      );
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) throw new Error(cloudData.error?.message || 'Cloudinary failed');

      const res = await fetch(`/api/branch/direct-purchase/${id}/upload-estimate-agreement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementUrl: cloudData.secure_url }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);

      toast.success('Agreement uploaded!', { id: t });
      router.push(`/branch/direct-purchase/${id}/post-estimation`);
    } catch (err) {
      toast.error(err.message, { id: t });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-10 bg-red-50 border border-red-200 p-6 rounded-2xl">
        <p className="font-bold text-red-800">Failed to load order</p>
        <p className="text-red-700 mt-2 text-sm">{error}</p>
        <p className="text-xs text-gray-500 mt-3 font-mono">Order ID: {id}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 mt-10">
      <Toaster position="top-center" />
      <div className="bg-white p-8 rounded-3xl shadow-lg border-t-4 border-yellow-500 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Sign Estimate Agreement</h1>
        <p className="text-gray-500 mt-2 max-w-lg mx-auto">
          Print the document, get the customer's signature agreeing to the melting process, and upload the signed copy.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button
            onClick={handlePrint}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <PrinterIcon className="w-5 h-5" /> Download / Print Agreement
          </button>
          <label className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md">
            <DocumentArrowUpIcon className="w-5 h-5" />
            {uploading ? 'Uploading...' : 'Upload Signed Copy'}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>
      <div style={{ position: 'fixed', left: '-10000px', top: 0, pointerEvents: 'none' }}>
        <EstimateAgreement
          ref={pdfRef}
          order={data.order}
          customer={data.order.customer}
          staff={data.order.staff}
        />
      </div>
    </div>
  );
}