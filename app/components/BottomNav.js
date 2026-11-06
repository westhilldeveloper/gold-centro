'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { HomeIcon, ClipboardIcon, UserIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';

export default function BottomNav() {
  const path = usePathname();
  const { user } = useAuth();
  const [hasPendingOrder, setHasPendingOrder] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
  const fetchPending = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/orders/ready-for-customer?customerId=${user.id}`);
      const data = await res.json();
      if (data.success) setPendingCount(data.orders.length);
    } catch (e) { /* ignore */ }
  };
  fetchPending();
}, [user]);

  useEffect(() => {
    const checkOrder = () => {
      const stored = localStorage.getItem('goldOrder');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          const age = Date.now() - data.timestamp;
          setHasPendingOrder(age < 24 * 60 * 60 * 1000);
        } catch (e) {
          setHasPendingOrder(false);
        }
      } else {
        setHasPendingOrder(false);
      }
    };

    checkOrder();
    window.addEventListener('storage', checkOrder);
    return () => window.removeEventListener('storage', checkOrder);
  }, []);

  // Base nav items (always visible)
  const navItems = [
    { name: 'Sell', href: '/', icon: HomeIcon },
    { name: 'Orders', href: '/orders', icon: ClipboardIcon },
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ];

  // ✅ Only show eKYC if user is logged in
  if (user) {
    navItems.push({ name: 'eKYC', href: '/ekyc', icon: UserIcon });
  }

  // Conditionally add QR tab if pending order exists
  if (hasPendingOrder) {
    navItems.push({
      name: 'QR',
      href: '/qr',
      icon: QrCodeIcon,
    });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50">
      {navItems.map((item) => {
        const isActive = path === item.href;
        const isEkyc = item.name === 'eKYC';
        // ✅ Check both front & back
        const hasAadhaar = user?.aadhaarFront && user?.aadhaarBack;

        return (
          <Link key={item.name} href={item.href} className="flex flex-col items-center text-xs relative">
            <div className="relative">
              <item.icon className={`w-6 h-6 ${isActive ? 'text-yellow-600' : 'text-gray-400'}`} />
              {isEkyc && (
                <span className="absolute -top-2 -right-3">
                  {hasAadhaar ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-4 h-4 text-red-500" />
                  )}
                </span>
              )}
            </div>
            <span className={isActive ? 'text-yellow-600' : 'text-gray-500'}>{item.name}</span>
            {item.name === 'QR' && (
              <span className="absolute -top-1 -right-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            )}
          </Link>
        );
      })}
    </div>
  );
}