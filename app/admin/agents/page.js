'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
  PhoneIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [branches, setBranches] = useState([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null); // null = create mode
  const [formData, setFormData] = useState({ name: '', phone: '', password: '',branchId: '', });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState({});

  // ---- Fetch agents ----
  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/admin/agents');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch agents');
      setAgents(data.agents);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  fetch('/api/admin/branches')
    .then((r) => r.json())
    .then((d) => { if (d.success) setBranches(d.branches); });
}, []);

  useEffect(() => {
    fetchAgents();
  }, []);

  // ---- Filter ----
  const filteredAgents = useMemo(() => {
    if (!searchTerm) return agents;
    const term = searchTerm.toLowerCase();
    return agents.filter(
      (a) =>
        a.name?.toLowerCase().includes(term) ||
        a.phone?.includes(term)
    );
  }, [agents, searchTerm]);

  // ---- Open create modal ----
  const openCreateModal = () => {
  setEditingAgent(null);
  setFormData({ name: '', phone: '', password: '', branchId: '' });
  setModalOpen(true);
};

  // ---- Open edit modal ----
  const openEditModal = (agent) => {
  setEditingAgent(agent);
  setFormData({
    name: agent.name,
    phone: agent.phone,
    password: '',
    branchId: agent.branchId || '',   // ← ADD
  });
  setModalOpen(true);
};

  // ---- Submit (create or update) ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Name and phone are required');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingAgent
        ? `/api/admin/agents/${editingAgent.id}`
        : '/api/admin/agents';
      const method = editingAgent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      toast.success(editingAgent ? 'Agent updated!' : 'Agent created!');
      setModalOpen(false);
      fetchAgents();
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Delete ----
  const handleDelete = async (agent) => {
    if (!confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return;

    setDeleting((prev) => ({ ...prev, [agent.id]: true }));
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      toast.success('Agent deleted');
      setAgents((prev) => prev.filter((a) => a.id !== agent.id));
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setDeleting((prev) => ({ ...prev, [agent.id]: false }));
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
            <UserGroupIcon className="w-8 h-8 text-yellow-600" />
            Agents
          </h1>
          <p className="text-gray-500 mt-1">{agents.length} agent(s) registered</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition"
        >
          <PlusIcon className="w-5 h-5" />
          Add Agent
        </motion.button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition"
        />
      </div>

      {/* Agents Table / Cards */}
      {filteredAgents.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No agents found.</p>
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
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredAgents.map((agent) => (
                    <motion.tr
                      key={agent.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                            {agent.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{agent.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-gray-700">{agent.phone}</td>
                      <td className="py-4 px-5 text-gray-700">
  {agent.branch ? (
    <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
      {agent.branch.name}
    </span>
  ) : (
    <span className="text-gray-400 italic text-sm">Not assigned</span>
  )}
</td>
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <ClipboardDocumentListIcon className="w-4 h-4" />
                          {agent._count?.assigned ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-sm text-gray-500">
                        {new Date(agent.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(agent)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <PencilSquareIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(agent)}
                            disabled={deleting[agent.id]}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Delete"
                          >
                            {deleting[agent.id] ? (
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
              {filteredAgents.map((agent) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-2xl shadow-md p-4 border border-gray-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-lg">
                        {agent.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{agent.name}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <PhoneIcon className="w-3 h-3" /> {agent.phone}
                        </p>
                        {agent.branch && (
  <p className="text-xs text-blue-600 mt-1">🏢 {agent.branch.name}</p>
)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {agent._count?.assigned ?? 0} order(s)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(agent)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(agent)}
                        disabled={deleting[agent.id]}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      >
                        {deleting[agent.id] ? (
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

      {/* Create/Edit Modal */}
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
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingAgent ? 'Edit Agent' : 'Add New Agent'}
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
                    placeholder="e.g. Rajesh Kumar"
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
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
                    Password <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingAgent ? 'Leave blank to keep current' : 'Set a password'}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition"
                  />
                </div>

                <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Branch <span className="text-gray-400 text-xs">(optional)</span>
  </label>
  <select
    value={formData.branchId}
    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition"
  >
    <option value="">Not Assigned</option>
    {branches.map((b) => (
      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
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
                    ) : (
                      editingAgent ? 'Update' : 'Create'
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