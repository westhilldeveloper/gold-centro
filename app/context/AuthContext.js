// context/AuthContext.js
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            // ✅ Ensure userType exists
            const userWithType = data.user.userType 
              ? data.user 
              : { 
                  ...data.user, 
                  userType: ['CUSTOMER', 'AGENT', 'ADMIN'].includes(data.user.role) ? 'USER' : 'BRANCH_STAFF' 
                };
            
            setUser(userWithType);
            localStorage.setItem('goldUser', JSON.stringify(userWithType));
          } else {
            localStorage.removeItem('goldUser');
          }
        } else if (res.status === 401) {
          localStorage.removeItem('goldUser');
        } else {
          const stored = localStorage.getItem('goldUser');
          if (stored) setUser(JSON.parse(stored));
        }
      } catch {
        const stored = localStorage.getItem('goldUser');
        if (stored) setUser(JSON.parse(stored));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---- Regular login (customer/agent/admin) ----
  const login = async (phone, role, name) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, role, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      const userWithType = { ...data.user, userType: 'USER' };
      setUser(userWithType);
      localStorage.setItem('goldUser', JSON.stringify(userWithType));

      if (data.token) localStorage.setItem('token', data.token);

      if (data.user.role === 'ADMIN') router.push('/admin');
      else if (data.user.role === 'AGENT') router.push('/agent');
      else router.push('/');

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ---- Branch staff login ----
  const loginBranchStaff = async (phone, password) => {
    try {
      const res = await fetch('/api/branch/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      // ✅ Force userType to BRANCH_STAFF so layout accepts it
      const userWithType = data.user.userType 
        ? data.user 
        : { ...data.user, userType: 'BRANCH_STAFF' };

      setUser(userWithType);
      localStorage.setItem('goldUser', JSON.stringify(userWithType));

      if (data.token) localStorage.setItem('token', data.token); 
      
      router.push('/branch');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const setUserData = (userData) => {
    setUser(userData);
    localStorage.setItem('goldUser', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch { /* ignore */ }
    setUser(null);
    localStorage.removeItem('goldUser');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginBranchStaff, logout, setUser: setUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);