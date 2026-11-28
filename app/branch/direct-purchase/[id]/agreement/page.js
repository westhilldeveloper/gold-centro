// D:\gold-centro\app\branch\direct-purchase\[id]\agreement\page.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { 
  DocumentArrowUpIcon, 
  PrinterIcon, 
  EyeIcon, 
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import BranchPurchaseAgreement from '../../../../components/BranchPurchaseAgreement';
import AgreementPreview from '../../../../components/AgreementPreview';
import { downloadPostEstimation as downloadPDF } from '../../../../../lib/downloadPostEstimation';

export default function AgreementPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [downloading, setDownloading] = useState(false);
  
  // ✅ Upload & Confirmation States
  const [uploading, setUploading] = useState(false);
  const [tempFileUrl, setTempFileUrl] = useState(null); // Uploaded to Cloudinary, but NOT saved in DB yet
  const [previewOpen, setPreviewOpen] = useState(false);
  
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

  // ✅ STEP 1: Just upload to Cloudinary. DO NOT touch the database yet.
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const t = toast.loading('Uploading file for preview...');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
      
      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: formData });
      const cloudData = await cloudRes.json();
      
      if (!cloudRes.ok) throw new Error(cloudData.error?.message || 'Cloudinary upload failed');

      // Save to temporary state so the agent can review it
      setTempFileUrl(cloudData.secure_url);
      setPreviewOpen(true); 
      toast.success('File uploaded. Please review.', { id: t });
      
    } catch (err) {
      toast.error(err.message, { id: t });
    } finally {
      setUploading(false);
    }
  };

  // ✅ STEP 2: Agent confirms. NOW we update the database and redirect.
  const handleProceed = async () => {
    if (!tempFileUrl) return;

    setUploading(true);
    const t = toast.loading('Finalizing agreement...');

    try {
      const res = await fetch(`/api/branch/direct-purchase/${id}/upload-agreement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementUrl: tempFileUrl })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      
      toast.success('Agreement finalized! Proceeding to Payment.', { id: t });
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

  const existingUrl = data?.order?.agreementUrl; // Already saved in DB
  const currentUrl = existingUrl || tempFileUrl; // Show existing or newly uploaded

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 mt-10">
      <Toaster position="top-center" />
      
      <div className="bg-white p-8 rounded-3xl shadow-lg border-t-4 border-yellow-500 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Sign & Finalize Payment</h1>
        <p className="text-gray-500 mt-2 max-w-lg mx-auto">
          Print the document below, get the customer's signature, and upload a photo or scan of the signed page.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button 
            onClick={handlePrint} 
            disabled={downloading} 
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition"
          >
            <PrinterIcon className="w-5 h-5" /> {downloading ? 'Preparing PDF...' : '1. Download / Print PDF'}
          </button>
          
          {/* Show Upload button ONLY if NO file is uploaded yet */}
          {!currentUrl && (
            <label className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-md disabled:opacity-50">
              <DocumentArrowUpIcon className="w-5 h-5" /> 
              {uploading ? 'Processing...' : '2. Upload Signed Agreement'}
              <input 
                type="file" 
                accept="image/*,application/pdf" 
                className="hidden" 
                onChange={handleUpload} 
                disabled={uploading} 
              />
            </label>
          )}
        </div>

        {/* If a file is uploaded (either temp or existing DB), show preview & proceed buttons */}
        {currentUrl && (
          <div className="mt-6 p-4 bg-green-50 rounded-2xl border border-green-200">
            <p className="text-green-800 font-semibold mb-4 flex items-center justify-center gap-2">
              <CheckCircleIcon className="w-6 h-6" /> Agreement Document Ready
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setPreviewOpen(true)}
                className="flex-1 bg-white border-2 border-green-500 text-green-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-100 transition"
              >
                <EyeIcon className="w-5 h-5" /> Review Document
              </button>
              
              {/* If it's just a temp file (not yet in DB), show Confirm button */}
              {(!existingUrl && tempFileUrl) ? (
                <button
                  onClick={handleProceed}
                  disabled={uploading}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? 'Saving...' : 'Confirm & Proceed'} <ArrowRightIcon className="w-5 h-5" />
                </button>
              ) : (
                /* If it's already in the DB, just allow them to go to payment */
                <button
                  onClick={() => router.push(`/branch/direct-purchase/${id}/pay`)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  Proceed to Payment <ArrowRightIcon className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {/* Option to re-upload if they messed up */}
            {!existingUrl && tempFileUrl && (
              <div className="mt-3 text-center">
                <label className="text-xs text-blue-600 hover:underline cursor-pointer">
                  Uploaded the wrong file? Click to re-upload.
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', left: '-10000px', top: 0, pointerEvents: 'none' }}>
        <BranchPurchaseAgreement 
          ref={pdfRef} 
          order={data.order} 
          customer={data.order.customer} 
          staff={data.order.staff} 
        />
      </div>

      <AgreementPreview 
        isOpen={previewOpen} 
        onClose={() => setPreviewOpen(false)} 
        url={currentUrl} 
      />
    </div>
  );
}