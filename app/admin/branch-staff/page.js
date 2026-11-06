'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  UsersIcon,
  XMarkIcon,
  PhoneIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const ROLE_OPTIONS = ['MANAGER', 'CASHIER', 'VAULT_KEEPER', 'TESTER', 'STAFF'];

export default function AdminBranchStaffPage() {
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    role: 'STAFF',
    branchId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState({});

  // ---- Fetch ----
  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/admin/branch-staff');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch staff');
      setStaff(data.staff);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/branches');
      const data = await res.json();
      if (data.success) setBranches(data.branches);
    } catch (err) {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchBranches();
  }, []);

  // ---- Filter ----
  const filteredStaff = useMemo(() => {
    let list = [...staff];
    if (branchFilter) list = list.filter((s) => s.branchId === branchFilter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(term) ||
          s.phone?.includes(term) ||
          s.role?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [staff, searchTerm, branchFilter]);

  // ---- Modal handlers ----
  const openCreateModal = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      phone: '',
      password: '',
      role: 'STAFF',
      branchId: branches[0]?.id || '',
    });
    setModalOpen(true);
  };

  const openEditModal = (s) => {
    setEditingStaff(s);
    setFormData({
      name: s.name,
      phone: s.phone,
      password: '',
      role: s.role,
      branchId: s.branchId,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.branchId) {
      toast.error('Name, phone, and branch are required');
      return;
    }
    if (!editingStaff && !formData.password) {
      toast.error('Password is required for new staff');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingStaff
        ? `/api/admin/branch-staff/${editingStaff.id}`
        : '/api/admin/branch-staff';
      const method = editingStaff ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      toast.success(editingStaff ? 'Staff updated!' : 'Staff created!');
      setModalOpen(false);
      fetchStaff();
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Delete staff "${s.name}"? This cannot be undone.`)) return;
    setDeleting((prev) => ({ ...prev, [s.id]: true }));
    try {
      const res = await fetch(`/api/admin/branch-staff/${s.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      toast.success('Staff deleted');
      setStaff((prev) => prev.filter((x) => x.id !== s.id));
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setDeleting((prev) => ({ ...prev, [s.id]: false }));
    }
  };

  // ---- Role badge colors ----
  const roleColor = (role) => {
    const map = {
      MANAGER: 'bg-purple-100 text-purple-700',
      CASHIER: 'bg-green-100 text-green-700',
      VAULT_KEEPER: 'bg-blue-100 text-blue-700',
      TESTER: 'bg-orange-100 text-orange-700',
      STAFF: 'bg-gray-100 text-gray-700',
    };
    return map[role] || map.STAFF;
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
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl">
        <p className="font-semibold">⚠️ Error</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <UsersIcon className="w-8 h-8 text-yellow-600" />
            Branch Staff
          </h1>
          <p className="text-gray-500 mt-1">
            {staff.length} staff member(s) across {branches.length} branch(es)
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreateModal}
          disabled={branches.length === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50"
        >
          <PlusIcon className="w-5 h-5" /> Add Staff
        </motion.button>
      </div>

      {branches.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          ⚠️ You need to create a branch before adding staff.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition"
          />
        </div>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </div>

      {/* Table / Cards */}
      {filteredStaff.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No staff found.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredStaff.map((s) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                            {s.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{s.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-gray-700">{s.phone}</td>
                      <td className="py-4 px-5">
                        {s.branch ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                            <BuildingStorefrontIcon className="w-3 h-3" />
                            {s.branch.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-sm">Not assigned</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColor(s.role)}`}>
                          {s.role}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        {s.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700">
                            <CheckCircleIcon className="w-4 h-4" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-700">
                            <XCircleIcon className="w-4 h-4" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <PencilSquareIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            disabled={deleting[s.id]}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Delete"
                          >
                            {deleting[s.id] ? (
                              <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <TrashIcon className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            <AnimatePresence>
              {filteredStaff.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-2xl shadow-md p-4 border border-gray-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-lg">
                        {s.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{s.name}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <PhoneIcon className="w-3 h-3" /> {s.phone}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColor(s.role)}`}>
                            {s.role}
                          </span>
                          {s.branch && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                              {s.branch.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <span className={`text-xs ${s.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {s.isActive ? '✓ Active' : '✕ Inactive'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(s)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        disabled={deleting[s.id]}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      >
                        {deleting[s.id] ? (
                          <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <TrashIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingStaff ? 'Edit Staff' : 'Add Branch Staff'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password{' '}
                    {editingStaff ? (
                      <span className="text-gray-400 text-xs">(leave blank to keep current)</span>
                    ) : (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingStaff ? 'Leave blank to keep current' : 'Set a password'}
                    required={!editingStaff}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-3 rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : editingStaff ? (
                      'Update'
                    ) : (
                      'Create'
                    )}
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