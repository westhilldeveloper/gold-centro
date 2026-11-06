// app/branch/layout.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  CubeIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
  UsersIcon,
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  PlusCircleIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const menuItems = [
  { name: 'Dashboard', href: '/branch', icon: HomeIcon },
  { name: 'Stock', href: '/branch/stock', icon: CubeIcon },
  { name: 'Direct Purchase', href: '/branch/direct-purchase/new', icon: PlusCircleIcon },
  { name: 'Deposits', href: '/branch/deposits', icon: ArrowDownTrayIcon },
  { name: 'Fund Requests', href: '/branch/fund-requests', icon: BanknotesIcon },
  { name: 'Cash', href: '/branch/cash', icon: BanknotesIcon },
  { name: 'Agent Cash Requests', href: '/branch/agent-cash-requests', icon: BanknotesIcon },
  { name: 'Movements', href: '/branch/movements', icon: ArrowsRightLeftIcon },
  { name: 'Orders', href: '/branch/orders', icon: ShoppingBagIcon },
  { name: 'Reports', href: '/branch/reports', icon: DocumentChartBarIcon },
  { name: 'Agents', href: '/branch/agents', icon: UserGroupIcon },
  { name: 'Staff', href: '/branch/staff', icon: UsersIcon },
];

export default function BranchLayout({ children }) {
  const path = usePathname();
  const router = useRouter();
  // ✅ ADDED: loading state
  const { user, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return; // ✅ Don't redirect while still loading

    if (!user) {
      router.push('/branch-login');
      return;
    }
    if (user.userType !== 'BRANCH_STAFF') {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user || user.userType !== 'BRANCH_STAFF') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Checking access...</div>
      </div>
    );
  }

  const SidebarContent = () => (
    <>
      <div className="px-6 py-5 border-b border-gray-800">
        <h2 className="text-xl font-bold text-yellow-400">{user.branch?.name || 'Branch'}</h2>
        <p className="text-xs text-gray-400 mt-1">{user.branch?.code}</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => {
          const isActive = path === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-yellow-500/10 text-yellow-400 border-r-4 border-yellow-400'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold">
              {user.name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{user.name}</p>
              <p className="text-[10px]">{user.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-red-400 transition p-2 rounded-lg hover:bg-gray-800"
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="hidden md:flex md:flex-col w-64 bg-gray-900 fixed h-screen z-30">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 left-0 h-full w-64 bg-gray-900 flex flex-col z-50 md:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 md:ml-64">
        <div className="md:hidden bg-gray-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-gray-800">
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-yellow-400">{user.branch?.name || 'Branch'}</h1>
          <div className="w-6" />
        </div>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}