'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { XMarkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function CustomerDetailsModal({ isOpen, onClose, customer }) {
  if (!isOpen || !customer) return null;

  const hasAadhaar = customer.aadhaarFront && customer.aadhaarBack;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white p-4 border-b border-gray-200 flex justify-between items-center rounded-t-3xl">
              <h2 className="text-xl font-bold">Customer Details</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{customer.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{customer.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium capitalize">{customer.role?.toLowerCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="font-medium">{customer.orders?.length || 0}</p>
                </div>
              </div>

              {/* eKYC Status */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold mb-2">eKYC Status</h3>
                <div className="flex items-center gap-3">
                  {hasAadhaar ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-6 h-6 text-red-500" />
                  )}
                  <span className={hasAadhaar ? 'text-green-700' : 'text-red-700'}>
                    {hasAadhaar ? 'Verified' : 'Not Verified'}
                  </span>
                </div>
                {customer.aadhaarNumber && (
                  <p className="mt-2 text-sm">
                    <span className="text-gray-500">Aadhaar Number:</span>{' '}
                    <span className="font-medium">{customer.aadhaarNumber}</span>
                  </p>
                )}
              </div>

              {/* Aadhaar Documents */}
              <div>
                <h3 className="font-semibold mb-2">Uploaded Documents</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Front Side</p>
                    {customer.aadhaarFront ? (
                      <div className="relative w-full aspect-[3/2] mt-1 border rounded-lg overflow-hidden">
                        <Image
                          src={customer.aadhaarFront}
                          alt="Aadhaar Front"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-[3/2] bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400 mt-1">
                        Not uploaded
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Back Side</p>
                    {customer.aadhaarBack ? (
                      <div className="relative w-full aspect-[3/2] mt-1 border rounded-lg overflow-hidden">
                        <Image
                          src={customer.aadhaarBack}
                          alt="Aadhaar Back"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-[3/2] bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400 mt-1">
                        Not uploaded
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              {customer.orders && customer.orders.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Recent Orders</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {customer.orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="bg-gray-50 p-3 rounded-lg flex justify-between text-sm">
                        <span>#{order.id.slice(-6)}</span>
                        <span>{order.weight}g {order.purity}</span>
                        <span className="capitalize">{order.status.replace('_', ' ').toLowerCase()}</span>
                        <span>₹{order.estimatedTotal?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}