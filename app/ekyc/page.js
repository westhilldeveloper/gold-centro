'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import Image from 'next/image';

export default function EkycPage() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  // Aadhaar
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [aadhaarNumber, setAadhaarNumber] = useState(user?.aadhaarNumber || '');
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  // PAN (front + number only)
  const [panFrontPreview, setPanFrontPreview] = useState(null);
  const [panNumber, setPanNumber] = useState(user?.panNumber || '');
  const panFrontInputRef = useRef(null);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // ---------- Aadhaar handlers ----------
  const handleFrontChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setFrontPreview(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleBackChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setBackPreview(event.target.result);
    reader.readAsDataURL(file);
  };

  // ---------- PAN front handler ----------
  const handlePanFrontChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setPanFrontPreview(event.target.result);
    reader.readAsDataURL(file);
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Cloudinary upload failed');
    return data.secure_url;
  };

  const handleSubmit = async () => {
    setUploading(true);
    try {
      // Aadhaar uploads
      let frontUrl = user?.aadhaarFront;
      let backUrl  = user?.aadhaarBack;
      if (frontInputRef.current?.files?.[0]) {
        frontUrl = await uploadToCloudinary(frontInputRef.current.files[0]);
      }
      if (backInputRef.current?.files?.[0]) {
        backUrl = await uploadToCloudinary(backInputRef.current.files[0]);
      }

      // PAN upload (front only)
      let panFrontUrl = user?.panFront;
      if (panFrontInputRef.current?.files?.[0]) {
        panFrontUrl = await uploadToCloudinary(panFrontInputRef.current.files[0]);
      }

      // Validate PAN number if provided
      const trimmedPan = panNumber.trim().toUpperCase();
      if (trimmedPan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(trimmedPan)) {
        throw new Error('PAN must be in the format ABCDE1234F');
      }

      const saveRes = await fetch('/api/user/aadhaar', {   // or keep '/api/user/aadhaar'
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          // Aadhaar
          frontImage: frontUrl,
          backImage: backUrl,
          aadhaarNumber: aadhaarNumber.trim() || null,
          // PAN
          panFrontImage: panFrontUrl,
          panNumber: trimmedPan || null,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save');

      const updatedUser = { ...user, ...saveData.user };
      setUser(updatedUser);
      localStorage.setItem('goldUser', JSON.stringify(updatedUser));

      toast.success('✅ KYC details saved!');

      // Clear previews and inputs
      setFrontPreview(null);
      setBackPreview(null);
      setPanFrontPreview(null);
      if (frontInputRef.current)    frontInputRef.current.value = '';
      if (backInputRef.current)     backInputRef.current.value = '';
      if (panFrontInputRef.current) panFrontInputRef.current.value = '';
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const aadhaarComplete = user?.aadhaarFront && user?.aadhaarBack;
  const panComplete     = user?.panFront && user?.panNumber;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-black mb-2">eKYC Verification</h1>
        <p className="text-gray-500 text-sm mb-6">
          Upload your Aadhaar and PAN details.
        </p>

        <div className="space-y-6">
          {/* ============ AADHAAR ============ */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-1">
              Aadhaar
            </h2>

            <div className={`p-3 rounded-xl flex items-center gap-3 ${
              aadhaarComplete
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <span className="text-2xl">{aadhaarComplete ? '✅' : '📄'}</span>
              <div>
                <p className={`font-medium ${aadhaarComplete ? 'text-green-700' : 'text-yellow-700'}`}>
                  {aadhaarComplete ? 'Aadhaar verified' : 'Aadhaar not complete'}
                </p>
                <p className="text-xs text-gray-500">
                  {aadhaarComplete
                    ? 'Both sides uploaded.'
                    : 'Please upload front & back images.'}
                </p>
              </div>
            </div>

            {/* Front */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Aadhaar front</label>
              <input
                type="file"
                accept="image/*"
                ref={frontInputRef}
                onChange={handleFrontChange}
                className="w-full border-2 border-gray-300 rounded-xl p-2 focus:border-yellow-500 outline-none"
              />
              {frontPreview && (
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <img src={frontPreview} alt="Front preview" className="w-full h-auto max-h-40 object-contain" />
                </div>
              )}
              {user?.aadhaarFront && !frontPreview && (
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <Image src={user.aadhaarFront} alt="Existing front" width={400} height={250} className="w-full h-auto object-cover" />
                </div>
              )}
            </div>

            {/* Back */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Aadhaar back</label>
              <input
                type="file"
                accept="image/*"
                ref={backInputRef}
                onChange={handleBackChange}
                className="w-full border-2 border-gray-300 rounded-xl p-2 focus:border-yellow-500 outline-none"
              />
              {backPreview && (
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <img src={backPreview} alt="Back preview" className="w-full h-auto max-h-40 object-contain" />
                </div>
              )}
              {user?.aadhaarBack && !backPreview && (
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <Image src={user.aadhaarBack} alt="Existing back" width={400} height={250} className="w-full h-auto object-cover" />
                </div>
              )}
            </div>

            {/* Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Aadhaar Number <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-xl p-3 focus:border-yellow-500 outline-none"
                placeholder="12-digit number"
                maxLength="12"
              />
            </div>
          </section>

          {/* ============ PAN (front + number only) ============ */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-1">
              PAN Card
            </h2>

            <div className={`p-3 rounded-xl flex items-center gap-3 ${
              panComplete
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <span className="text-2xl">{panComplete ? '✅' : '📄'}</span>
              <div>
                <p className={`font-medium ${panComplete ? 'text-green-700' : 'text-yellow-700'}`}>
                  {panComplete ? 'PAN verified' : 'PAN not complete'}
                </p>
                <p className="text-xs text-gray-500">
                  {panComplete
                    ? 'PAN front + number uploaded.'
                    : 'Upload PAN front and enter PAN number.'}
                </p>
              </div>
            </div>

            {/* PAN front */}
            <div>
              <label className="block text-sm font-medium text-gray-700">PAN front</label>
              <input
                type="file"
                accept="image/*"
                ref={panFrontInputRef}
                onChange={handlePanFrontChange}
                className="w-full border-2 border-gray-300 rounded-xl p-2 focus:border-yellow-500 outline-none"
              />
              {panFrontPreview && (
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <img src={panFrontPreview} alt="PAN front preview" className="w-full h-auto max-h-40 object-contain" />
                </div>
              )}
              {user?.panFront && !panFrontPreview && (
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <Image src={user.panFront} alt="Existing PAN front" width={400} height={250} className="w-full h-auto object-cover" />
                </div>
              )}
            </div>

            {/* PAN number */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                PAN Number <span className="text-red-500 text-xs">*</span>
              </label>
              <input
                type="text"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                className="w-full border-2 border-gray-300 rounded-xl p-3 focus:border-yellow-500 outline-none font-mono uppercase"
                placeholder="ABCDE1234F"
                maxLength="10"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
              </p>
            </div>
          </section>

          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold p-3 rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-50"
          >
            {uploading ? 'Saving...' : 'Save KYC Details'}
          </button>
        </div>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}