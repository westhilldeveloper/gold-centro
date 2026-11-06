// components/SocketBoot.jsx
'use client';

import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { connectSocket, disconnectSocket } from '../../lib/socket';

export function SocketBoot() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) connectSocket();
    else disconnectSocket();
  }, [user, loading]);

  return null;
}