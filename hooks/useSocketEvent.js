// hooks/useSocketEvent.js
'use client';
import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';

/**
 * Subscribe to a socket event with a stable listener.
 * - Handler always sees the latest closure (via ref).
 * - Cleanup removes ONLY this instance's listener (not other components').
 * - Safe under React Strict Mode double-mount.
 */
export function useSocketEvent(event, handler) {
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; });

  useEffect(() => {
    const s = getSocket();
    const listener = (...args) => ref.current?.(...args);
    s.on(event, listener);
    return () => { s.off(event, listener); };
  }, [event]);
}