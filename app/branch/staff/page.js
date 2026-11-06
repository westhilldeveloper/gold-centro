'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { PlusIcon, UsersIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

export default function BranchStaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', password: '', role: 'STAFF' });
  const [submitting, setSubmitting] = useState(false);

  const isManager = user?.role === 'MANAGER';

  const load = async () => {
    if (!user?.branchId) return;
    const res = await fetch(`/api/branch/staff?branchId=${user.branchId}`);
    const d = await res.json();
    if (d.success) setStaff(d.staff);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/branch/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, branchId: user.branchId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success('Staff created');
      setModal(false);
      setForm({ name: '', phone: '', password: '', role: 'STAFF' });
      load();
    } catch (err) { toast.error('❌ ' + err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this staff member?')) return;
    try {
      const res = await fetch(`/api/branch/staff/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Deleted');
      setStaff((p) => p.filter((s) => s.id !== id));
    } catch (err) { toast.error('❌ ' + err.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <UsersIcon className="w-8 h-8 text-yellow-600" /> Staff
          </h1>
          <p className="text-gray-500 mt-1">{staff.length} staff member(s)</p>
        </div>
        {isManager && (
          <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-5 py-3 rounded-xl">
            <PlusIcon className="w-5 h-5" /> Add Staff
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((s) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-md p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.phone}</p>
                  <p className="text-xs text-yellow-600 font-medium mt-1">{s.role}</p>
                </div>
              </div>
              {isManager && s.id !== user.id && (
                <button onClick={() => handleDelete(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Add Staff</h2>
                <button onClick={() => setModal(false)} className="text-gray-400"><XMarkIcon className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none" />
                <input type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none" />
                <input type="text" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none" />
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none">
                  <option value="MANAGER">Manager</option>
                  <option value="CASHIER">Cashier</option>
                  <option value="VAULT_KEEPER">Vault Keeper</option>
                  <option value="TESTER">Tester</option>
                  <option value="STAFF">Staff</option>
                </select>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setModal(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-medium">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-3 rounded-xl disabled:opacity-50">
                    {submitting ? 'Creating...' : 'Create'}
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