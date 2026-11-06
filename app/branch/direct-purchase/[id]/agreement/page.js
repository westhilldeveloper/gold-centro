'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { DocumentArrowUpIcon, PrinterIcon } from '@heroicons/react/24/outline';
import BranchPurchaseAgreement from '../../../../components/BranchPurchaseAgreement';
import { downloadPostEstimation as downloadPDF } from '../../../../../lib/downloadPostEstimation';

export default function AgreementPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    fetch(`/api/branch/direct-purchase/${id}`)
      .then(r => r.json())
      .then(d => { 
        if (d.success) setData(d); 
        else toast.error(d.error || 'Failed to load order');
      })
      .catch(() => toast.error('Failed to load order'));
  }, [id]);

  const handlePrint = async () => {
    if (!pdfRef.current || !data?.order) return;
    setDownloading(true);
    try {
      await downloadPDF(pdfRef.current, data.order);
      toast.success('PDF Downloaded');
    } catch (err) {
      toast.error('Download failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleUpload = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  setUploading(true);
  const t = toast.loading('Uploading signed agreement...');
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
    
    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: formData });
    const cloudData = await cloudRes.json();
    
    // NEW: Call upload-agreement route
    const res = await fetch(`/api/branch/direct-purchase/${id}/upload-agreement`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agreementUrl: cloudData.secure_url })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);
    
    toast.success('Agreement uploaded! Proceeding to payment.', { id: t });
    
    // NEW: Redirect to pay page
    router.push(`/branch/direct-purchase/${id}/pay`);
    
  } catch (err) {
    toast.error(err.message, { id: t });
  } finally {
    setUploading(false);
  }
};

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 mt-10">
      <Toaster position="top-center" />
      
      <div className="bg-white p-8 rounded-3xl shadow-lg border-t-4 border-yellow-500 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Sign & Finalize Payment</h1>
        <p className="text-gray-500 mt-2 max-w-lg mx-auto">
          Print the document below, get the customer's signature, and upload a photo or scan of the signed page to complete the purchase.
        </p>
        <p className="text-red-500 font-medium text-sm mt-2">
          Note: The funds will only be transferred and the items added to stock *after* you upload the signed agreement.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button 
            onClick={handlePrint} 
            disabled={downloading} 
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition"
          >
            <PrinterIcon className="w-5 h-5" /> {downloading ? 'Preparing PDF...' : '1. Download / Print PDF'}
          </button>
          
          <label className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-md disabled:opacity-50">
            <DocumentArrowUpIcon className="w-5 h-5" /> 
            {uploading ? 'Processing...' : '2. Upload Signed & Finalize'}
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
        <BranchPurchaseAgreement 
          ref={pdfRef} 
          order={data.order} 
          customer={data.order.customer} 
          staff={data.order.staff} 
        />
      </div>
    </div>
  );
}