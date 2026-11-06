'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import BottomNav from './BottomNav';

export default function MobileContainer({ children }) {
  const path = usePathname();
  const [mounted, setMounted] = useState(false);

  // Only run client-side after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and first client render, render a stable shell
  const isAdminPath = mounted && path?.startsWith('/admin');
  const isBranchPath = mounted && path?.startsWith('/branch');
  const isAgentPath = mounted && path?.startsWith('/agent');
  const hideNav = mounted && (path === '/login' || path === '/branch-login');

  // Admin / branch / agent have their own layouts — skip the mobile wrapper
  if (isAdminPath || isBranchPath || isAgentPath) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-full mx-auto bg-white min-h-screen shadow-lg relative flex flex-col">
      <div className={`flex-1 overflow-y-auto p-4 ${hideNav ? 'pb-4' : 'pb-20'}`}>
        {children}
      </div>
      {mounted && !hideNav && <BottomNav />}
    </div>
  );
}