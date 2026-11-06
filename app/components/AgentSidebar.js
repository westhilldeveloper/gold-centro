'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  BanknotesIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const menuItems = [
  { name: 'Dashboard', href: '/agent', icon: HomeIcon },
  { name: 'Orders', href: '/agent/orders', icon: ClipboardDocumentListIcon },
  { name: 'Gold', href: '/agent/gold', icon: CubeIcon },
  { name: 'Cash', href: '/agent/cash', icon: BanknotesIcon },
  { name: 'Reports', href: '/agent/reports', icon: ChartBarIcon },
];

export default function AgentSidebar({ onNavigate }) {
  const path = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      <div className="px-6 py-5 border-b border-gray-800">
        <h2 className="text-xl font-bold text-yellow-400">Gold Centro</h2>
        <p className="text-xs text-gray-400 mt-1">Agent Portal</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => {
          const isActive = path === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
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
          <div className="flex items-center gap-2 text-xs text-gray-400 min-w-0">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name || 'Agent'}</p>
              <p className="text-[10px]">{user?.phone}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-red-400 transition p-2 rounded-lg hover:bg-gray-800 flex-shrink-0"
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
}