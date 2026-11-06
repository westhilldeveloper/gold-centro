'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  BuildingStorefrontIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  MapPinIcon,
  PhoneIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', code: '', address: '', city: '', state: '', pincode: '', phone: '', isHeadOffice: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState({});

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/branches');
      const data = await res.json();
      if (data.success) setBranches(data.branches);
    } catch (err) {
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBranches(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', address: '', city: '', state: '', pincode: '', phone: '', isHeadOffice: false });
    setModalOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      name: b.name, code: b.code, address: b.address || '', city: b.city || '',
      state: b.state || '', pincode: b.pincode || '', phone: b.phone || '',
      isHeadOffice: b.isHeadOffice,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code) { toast.error('Name and code are required'); return; }
    setSubmitting(true);
    try {
      const url = editing ? `/api/admin/branches/${editing.id}` : '/api/admin/branches';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? 'Branch updated!' : 'Branch created!');
      setModalOpen(false);
      fetchBranches();
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (b) => {
    if (!confirm(`Delete branch "${b.name}"?`)) return;
    setDeleting((p) => ({ ...p, [b.id]: true }));
    try {
      const res = await fetch(`/api/admin/branches/${b.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Branch deleted');
      setBranches((prev) => prev.filter((x) => x.id !== b.id));
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setDeleting((p) => ({ ...p, [b.id]: false }));
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BuildingStorefrontIcon className="w-8 h-8 text-yellow-600" />
            Branches
          </h1>
          <p className="text-gray-500 mt-1">{branches.length} branch(es)</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-lg"
        >
          <PlusIcon className="w-5 h-5" /> Add Branch
        </motion.button>
      </div>

      {branches.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <BuildingStorefrontIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No branches yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md p-5 border border-gray-100 relative"
            >
              {b.isHeadOffice && (
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">
                  <StarIcon className="w-3 h-3" /> Head Office
                </div>
              )}
              <h3 className="text-lg font-bold text-gray-900 pr-20">{b.name}</h3>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{b.code}</p>

              <div className="mt-3 space-y-1.5 text-sm text-gray-600">
                {b.address && <p className="flex items-start gap-1.5"><MapPinIcon className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />{b.address}{b.city ? `, ${b.city}` : ''}{b.pincode ? ` - ${b.pincode}` : ''}</p>}
                {b.phone && <p className="flex items-center gap-1.5"><PhoneIcon className="w-4 h-4 text-gray-400" />{b.phone}</p>}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">Agents</p>
                  <p className="font-bold text-gray-900">{b._count?.agents ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Orders</p>
                  <p className="font-bold text-gray-900">{b._count?.orders ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Txns</p>
                  <p className="font-bold text-gray-900">{b._count?.cashTransactions ?? 0}</p>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => openEdit(b)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                  <PencilSquareIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(b)}
                  disabled={deleting[b.id]}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                >
                  {deleting[b.id] ? <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /> : <TrashIcon className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold">{editing ? 'Edit Branch' : 'Add Branch'}</h2>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Code *</label>
                    <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required
                      placeholder="BLR-001"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                    <input type="text" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none" />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isHeadOffice} onChange={(e) => setForm({ ...form, isHeadOffice: e.target.checked })}
                    className="w-4 h-4 accent-yellow-500" />
                  <span className="text-sm font-medium text-gray-700">Mark as Head Office</span>
                </label>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-3 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? <><div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> Saving...</> : editing ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}