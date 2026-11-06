'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FireIcon,
  XMarkIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

export default function MeltIntoBarModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  selectedItems,
  defaultPurity,
}) {
  const [weight, setWeight] = useState('');
  const [purity, setPurity] = useState(defaultPurity);
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const totalInput = selectedItems.reduce((s, i) => s + i.netWeight, 0);

  useEffect(() => {
    if (isOpen && selectedItems.length > 0) {
      setWeight(totalInput.toFixed(2));

      const purities = new Set(
        selectedItems.map((it) => it.order?.purity).filter(Boolean)
      );
      const defaultP =
        purities.size === 1
          ? Array.from(purities)[0]
          : defaultPurity !== 'MIXED'
          ? defaultPurity
          : '24K';

      setPurity(defaultP);
      setImageUrl('');
      setNotes('');
    }
  }, [isOpen, totalInput, defaultPurity, selectedItems]);

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      setImageUrl(data.secure_url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FireIcon className="w-5 h-5 text-orange-600" /> Melt Into Bar
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedItems.length} item(s) • {totalInput.toFixed(2)}g input
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 max-h-32 overflow-y-auto">
            <p className="text-xs text-gray-500 font-medium mb-2">Melted from:</p>
            <div className="space-y-1">
              {selectedItems.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700">{it.name} ×{it.count}</span>
                  <span className="font-medium text-gray-900">{it.netWeight.toFixed(2)}g</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bar Weight (g) *
              </label>
              <input
                type="number"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purity</label>
              <select
                value={purity}
                onChange={(e) => setPurity(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-orange-500 outline-none"
              >
                <option value="24K">24K</option>
                <option value="22K">22K</option>
                <option value="20K">20K</option>
                <option value="18K">18K</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bar Photo</label>
            {imageUrl ? (
              <div className="relative inline-block">
                <img
                  src={imageUrl}
                  alt="Bar"
                  className="w-32 h-32 object-cover rounded-xl border border-gray-200"
                />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 text-sm text-gray-500 border-2 border-dashed border-gray-300 rounded-xl px-4 py-6 cursor-pointer hover:border-orange-400">
                <PhotoIcon className="w-5 h-5" />
                {uploading ? 'Uploading...' : 'Click to upload bar photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImage}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-orange-500 outline-none"
            />
          </div>

          {weight && totalInput > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-800">
              💡 Weight loss:{' '}
              <strong>{(totalInput - parseFloat(weight || 0)).toFixed(2)}g</strong>{' '}
              ({((1 - parseFloat(weight || 0) / totalInput) * 100).toFixed(1)}%)
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit({ weight, purity, imageUrl, notes })}
            disabled={submitting || !weight}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Melting...
              </>
            ) : (
              <>
                <FireIcon className="w-5 h-5" /> Create Bar
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}