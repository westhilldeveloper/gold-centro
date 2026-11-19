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
            const userWithType = data.user.userType
              ? data.user
              : { ...data.user, userType: ['CUSTOMER','AGENT','ADMIN'].includes(data.user.role) ? 'USER' : 'BRANCH_STAFF' };
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

  // Persist a session returned by any auth endpoint (login / set-password)
  const applySession = (userData, token) => {
    const userWithType = { ...userData, userType: 'USER' };
    setUser(userWithType);
    localStorage.setItem('goldUser', JSON.stringify(userWithType));
    if (token) localStorage.setItem('token', token);
  };

  const login = async (phone, password, role, next) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      applySession(data.user, data.token);

      if (next && next.startsWith('/')) router.push(next);
      else if (data.user.role === 'ADMIN') router.push('/admin');
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

  
const logout = async (redirectTo = '/login') => {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch {}
  setUser(null);
  localStorage.removeItem('goldUser');
  localStorage.removeItem('token');   // ← the missing line
  router.push(redirectTo);
};
  return (
    <AuthContext.Provider value={{ user, loading, login, loginBranchStaff, logout, setUser: setUserData, applySession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);