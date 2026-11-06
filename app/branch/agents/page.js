'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  UserGroupIcon,
  PhoneIcon,
  PencilSquareIcon,
  XMarkIcon,
  PhotoIcon,
  TrashIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

export default function BranchAgents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState(null);

  const load = async () => {
    if (!user?.branchId) return;
    try {
      const res = await fetch(`/api/branch/agents?branchId=${user.branchId}`);
      const data = await res.json();
      if (data.success) setAgents(data.agents || []);
    } catch (err) {
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleSaved = (updated) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
    );
    setEditingAgent(null);
    toast.success('✅ Agent updated');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />

      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <UserGroupIcon className="w-8 h-8 text-yellow-600" /> Agents
        </h1>
        <p className="text-gray-500 mt-1">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} in this branch
        </p>
      </div>

      {agents.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center text-gray-500">
          No agents assigned to this branch.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md p-5 relative"
            >
              {/* Edit button */}
              <button
                type="button"
                onClick={() => setEditingAgent(a)}
                className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-yellow-700 hover:bg-yellow-50 transition"
                title="Edit agent"
              >
                <PencilSquareIcon className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                {/* Avatar */}
                {a.profilePhoto ? (
                  <img
                    src={a.profilePhoto}
                    alt={a.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-yellow-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-lg">
                    {a.name?.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1 pr-8">
                  <p className="font-semibold truncate">{a.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <PhoneIcon className="w-3 h-3" /> {a.phone}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-sm">
                <span className="text-gray-500">Orders</span>
                <span className="font-bold">{a._count?.assigned ?? 0}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <EditAgentModal
        agent={editingAgent}
        onClose={() => setEditingAgent(null)}
        onSaved={handleSaved}
      />
    </div>
  );
}

// ============================================
// Edit Agent Modal
// ============================================
function EditAgentModal({ agent, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState(null); // URL string | null
  const [photoFile, setPhotoFile] = useState(null); // File | null
  const [photoPreview, setPhotoPreview] = useState(null); // data URL | URL
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Hydrate when the agent prop changes
  useEffect(() => {
    if (!agent) return;
    setName(agent.name || '');
    setPhone(agent.phone || '');
    setPhoto(agent.profilePhoto || null);
    setPhotoFile(null);
    setPhotoPreview(agent.profilePhoto || null);
  }, [agent]);

  if (!agent) return null;

  const handlePickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large. Max 5 MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setPhotoFile(file);
    // Local preview via object URL — cleaned up on unmount or replace
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadPhotoIfAny = async () => {
    if (!photoFile) return photo; // nothing new to upload — return existing
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', photoFile);
      formData.append(
        'upload_preset',
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      );

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Cloudinary upload failed');
      }
      return data.secure_url;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      toast.error('Phone must be 10 digits');
      return;
    }

    setSaving(true);
    try {
      // 1) Upload new photo if there is one
      let finalPhoto = photo;
      if (photoFile) {
        finalPhoto = await uploadPhotoIfAny();
      }

      // 2) Persist the profile
      const res = await fetch(`/api/branch/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          profilePhoto: finalPhoto || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onSaved(data.agent);
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 22 }}
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Edit Agent</h2>
              <p className="text-xs text-gray-500 font-mono">
                #{agent.id.slice(-8).toUpperCase()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Photo picker */}
            <div className="flex items-center gap-4">
              <div className="relative">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-yellow-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-2xl border-2 border-yellow-200">
                    {name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 text-sm font-medium rounded-lg cursor-pointer transition">
                  <PhotoIcon className="w-4 h-4" />
                  {photoPreview ? 'Change photo' : 'Upload photo'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePickFile}
                  />
                </label>

                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    <TrashIcon className="w-3.5 h-3.5" /> Remove photo
                  </button>
                )}

                <p className="text-[10px] text-gray-400">
                  JPG / PNG, max 5 MB. Square crop works best.
                </p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
                placeholder="e.g. Anil Kumar"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                }
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none font-mono"
                placeholder="10-digit mobile number"
                maxLength={10}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-3 rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving || uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  {uploading ? 'Uploading…' : 'Saving…'}
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}