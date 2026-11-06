'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../../lib/socket';
import AgentSidebar from '../components/AgentSidebar';

export default function AgentLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'AGENT') {
      router.push('/');
    }
  }, [user, loading, router]);

  // Socket setup once at layout level
  useEffect(() => {
    if (!user || user.role !== 'AGENT') return;
    const socket = getSocket();
    socket.emit('join-room', `agent_${user.id}`);
    return () => {
      // keep connection alive across pages
    };
  }, [user]);

  if (loading || !user || user.role !== 'AGENT') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-gray-900 fixed h-screen z-30">
        <AgentSidebar />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 left-0 h-full w-64 bg-gray-900 flex flex-col z-50 md:hidden"
            >
              <AgentSidebar onNavigate={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 md:ml-64">
        <div className="md:hidden bg-gray-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-800"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-yellow-400">Agent Portal</h1>
          <div className="w-6" />
        </div>
        <main className="p-4 md:p-6 pb-24">{children}</main>
      </div>
    </div>
  );
}