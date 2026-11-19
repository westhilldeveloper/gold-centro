'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  ShoppingBagIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  UserGroupIcon,
  UsersIcon,
  Bars3Icon,
  XMarkIcon,
  UserPlusIcon,
  ArrowDownTrayIcon,
  IdentificationIcon,
  Squares2X2Icon,
  FireIcon,ArrowRightOnRectangleIcon,  
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
 

const menuItems = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingBagIcon },
   { name: 'Agent Custody', href: '/admin/agent-custody', icon: UserPlusIcon },
   { name: 'Track History', href: '/admin/track-history', icon: Squares2X2Icon }, 
  { name: 'Branches', href: '/admin/branches', icon: BuildingStorefrontIcon },
   { name: 'Branch Staff', href: '/admin/branch-staff', icon: IdentificationIcon },
  { name: 'Stock', href: '/admin/stock', icon: CubeIcon },
  { name: 'Agent Deposits', href: '/admin/deposits', icon: ArrowDownTrayIcon },
  { name: 'Stock Movement', href: '/admin/stock-movement', icon: ArrowsRightLeftIcon },
  { name: 'Melting', href: '/admin/melting', icon: FireIcon },
  { name: 'Fund Requests', href: '/admin/fund-requests', icon: BanknotesIcon },  
  { name: 'Cash', href: '/admin/cash', icon: BanknotesIcon },
  { name: 'Agents', href: '/admin/agents', icon: UserGroupIcon },
  { name: 'Customers', href: '/admin/customers', icon: UsersIcon },
];

export default function AdminLayout({ children }) {
  const path = usePathname();
  const router   = useRouter();

  const { user, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

   useEffect(() => {
    // Only redirect once auth has finished loading
    if (!loading && (!user || user.role !== 'ADMIN')) {
      const next = encodeURIComponent(path || '/admin');
      router.replace(`/login/admin?next=${next}`);
    }
  }, [user, loading, router, path]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // (b) Not an admin → return null while the redirect above fires
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  // Block non-admins
  // if (user && user.role !== 'ADMIN') {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
  //       <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl max-w-md text-center">
  //         <p className="font-semibold">⚠️ Access Denied</p>
  //         <p className="text-sm mt-1">You are not authorised to view this page.</p>
  //       </div>
  //     </div>
  //   );
  // }

  const handleLogout = async () => {
  if (!confirm('Sign out of the admin panel?')) return;
  await logout('/login/admin');
};

  const SidebarContent = () => (
    <>
      <div className="px-6 py-5 border-b border-gray-800">
        <h2 className="text-xl font-bold text-yellow-400">Gold Centro</h2>
        <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
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
     <div className="p-4 border-t border-gray-800 space-y-3">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold shrink-0">
          {user?.name?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {user?.name || 'Admin'}
          </p>
          <p className="text-[10px] truncate">{user?.phone}</p>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-medium text-sm py-2 rounded-lg border border-red-500/20 transition-colors"
      >
        <ArrowRightOnRectangleIcon className="w-4 h-4" />
        Logout
      </button>
    </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-gray-900 fixed h-screen z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (drawer) */}
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
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 md:ml-64">
        {/* Mobile Header */}
        <div className="md:hidden bg-gray-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-800 transition"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-yellow-400">Gold Centro Admin</h1>
          <div className="w-6" />
        </div>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}