'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { disconnectSocket } from '../../lib/socket';
import { motion } from 'framer-motion';
import { UserCircleIcon, PhoneIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  if (!user) return null;

  const handleLogout = async () => {
    disconnectSocket();    // immediate
    await logout();        // user→null, SocketBoot effect confirms disconnect
    // no router.push here — the effect above redirects to /login
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-8 border-t-4 border-yellow-500"
      >
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center text-4xl text-white font-bold shadow-lg mb-4">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <h2 className="text-2xl font-bold text-black">{user.name || 'User'}</h2>
          <p className="text-gray-500 text-sm">{user.role}</p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <PhoneIcon className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-400">Phone</p>
              <p className="font-medium">{user.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <UserGroupIcon className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-400">Role</p>
              <p className="font-medium capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <UserCircleIcon className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-400">User ID</p>
              <p className="font-medium text-sm">{user.id}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition"
          >
            Back to Home
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/30 transition"
          >
            Logout
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}