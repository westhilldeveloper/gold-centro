'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  UserGroupIcon,
  XMarkIcon,
  PhoneIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentListIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKyc, setFilterKyc] = useState('all'); // all | complete | pending

  // Modal state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // ---- Fetch customers ----
  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/admin/customers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch customers');
      setCustomers(data.customers);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // ---- Check eKYC status ----
  const isKycComplete = (c) => c.aadhaarFront && c.aadhaarBack;

  // ---- Filter + search ----
  const filteredCustomers = useMemo(() => {
    let filtered = [...customers];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(term) ||
          c.phone?.includes(term) ||
          c.aadhaarNumber?.includes(term)
      );
    }

    if (filterKyc === 'complete') {
      filtered = filtered.filter((c) => isKycComplete(c));
    } else if (filterKyc === 'pending') {
      filtered = filtered.filter((c) => !isKycComplete(c));
    }

    return filtered;
  }, [customers, searchTerm, filterKyc]);

  // ---- Open detail modal ----
  const openDetail = async (customer) => {
    setSelectedCustomer(customer);
    setModalOpen(true);
    setLoadingDetail(true);
    setCustomerDetail(null);

    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch details');
      setCustomerDetail(data.customer);
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setModalOpen(false);
    setSelectedCustomer(null);
    setCustomerDetail(null);
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

  const kycStats = {
    total: customers.length,
    complete: customers.filter(isKycComplete).length,
    pending: customers.filter((c) => !isKycComplete(c)).length,
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <UserGroupIcon className="w-8 h-8 text-yellow-600" />
          Customers
        </h1>
        <p className="text-gray-500 mt-1">{customers.length} customer(s) registered</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-md p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-100 text-blue-700">
            <UserGroupIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Customers</p>
            <p className="text-2xl font-bold">{kycStats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-100 text-green-700">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">KYC Complete</p>
            <p className="text-2xl font-bold">{kycStats.complete}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-100 text-red-700">
            <XCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">KYC Pending</p>
            <p className="text-2xl font-bold">{kycStats.pending}</p>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or Aadhaar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition"
          />
        </div>
        <select
          value={filterKyc}
          onChange={(e) => setFilterKyc(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 outline-none"
        >
          <option value="all">All Customers</option>
          <option value="complete">KYC Complete</option>
          <option value="pending">KYC Pending</option>
        </select>
      </div>

      {/* Table / Cards */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No customers found.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aadhaar</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">KYC</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const kycComplete = isKycComplete(customer);
                  return (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                            {customer.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="font-medium text-gray-900">{customer.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-gray-700">{customer.phone}</td>
                      <td className="py-4 px-5 text-gray-700">
                        {customer.aadhaarNumber || <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="py-4 px-5">
                        {kycComplete ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                            <CheckCircleIcon className="w-3.5 h-3.5" /> Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">
                            <XCircleIcon className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <ClipboardDocumentListIcon className="w-4 h-4" />
                          {customer._count?.orders ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => openDetail(customer)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium transition"
                        >
                          <EyeIcon className="w-4 h-4" /> View
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredCustomers.map((customer) => {
              const kycComplete = isKycComplete(customer);
              return (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-md p-4 border border-gray-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-lg">
                        {customer.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <PhoneIcon className="w-3 h-3" /> {customer.phone}
                        </p>
                      </div>
                    </div>
                    {kycComplete ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {customer._count?.orders ?? 0} order(s)
                    </span>
                    <button
                      onClick={() => openDetail(customer)}
                      className="text-blue-600 text-sm font-medium flex items-center gap-1"
                    >
                      <EyeIcon className="w-4 h-4" /> View
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Customer Detail Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeDetail}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-gray-900">Customer Details</h2>
                <button
                  onClick={closeDetail}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {loadingDetail ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : customerDetail ? (
                <div className="p-6 space-y-6">
                  {/* Personal Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center text-white font-bold text-2xl">
                      {customerDetail.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{customerDetail.name}</h3>
                      <p className="text-gray-500 flex items-center gap-1 mt-1">
                        <PhoneIcon className="w-4 h-4" /> {customerDetail.phone}
                      </p>
                      <p className="text-gray-400 text-sm flex items-center gap-1 mt-0.5">
                        <CalendarIcon className="w-4 h-4" />
                        Joined {new Date(customerDetail.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* eKYC Section */}
                  <div className="bg-gray-50 rounded-2xl p-5">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                      <IdentificationIcon className="w-5 h-5 text-yellow-600" />
                      eKYC Documents
                    </h4>

                    {/* Aadhaar Number */}
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Aadhaar Number</p>
                      <p className="font-mono text-lg font-medium text-gray-900 mt-1">
                        {customerDetail.aadhaarNumber || (
                          <span className="text-gray-400 italic text-base">Not provided</span>
                        )}
                      </p>
                    </div>

                    {/* Images */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Front Side</p>
                        {customerDetail.aadhaarFront ? (
                          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white">
                            <Image
                              src={customerDetail.aadhaarFront}
                              alt="Aadhaar Front"
                              width={400}
                              height={250}
                              className="w-full h-auto object-contain"
                            />
                          </div>
                        ) : (
                          <div className="h-40 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-300">
                            Not uploaded
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Back Side</p>
                        {customerDetail.aadhaarBack ? (
                          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white">
                            <Image
                              src={customerDetail.aadhaarBack}
                              alt="Aadhaar Back"
                              width={400}
                              height={250}
                              className="w-full h-auto object-contain"
                            />
                          </div>
                        ) : (
                          <div className="h-40 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-300">
                            Not uploaded
                          </div>
                        )}
                      </div>
                    </div>

                    {/* KYC status */}
                    <div className="mt-4">
                      {customerDetail.aadhaarFront && customerDetail.aadhaarBack ? (
                        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
                          <CheckCircleIcon className="w-4 h-4" /> KYC Complete
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium">
                          <XCircleIcon className="w-4 h-4" /> KYC Pending
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order History */}
                  <div>
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                      <ClipboardDocumentListIcon className="w-5 h-5 text-yellow-600" />
                      Recent Orders ({customerDetail.orders?.length || 0})
                    </h4>
                    {customerDetail.orders?.length === 0 ? (
                      <p className="text-gray-400 text-sm italic">No orders yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {customerDetail.orders.map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-sm"
                          >
                            <div>
                              <p className="font-mono text-xs text-gray-500">
                                #{order.id.slice(-8)}
                              </p>
                              <p className="text-gray-700 mt-0.5">
                                {order.weight}g ({order.purity})
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">
                                ₹{(order.finalPrice || order.estimatedTotal)?.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {order.status.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">No details available.</div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}