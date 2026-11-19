'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const ROLE_MAP = { customer: 'CUSTOMER', agent: 'AGENT', admin: 'ADMIN' };
const DASH     = { CUSTOMER: '/', AGENT: '/agent', ADMIN: '/admin' };

export default function RoleLoginPage() {
  const params  = useParams();
  const roleKey = String(params?.role || '').toLowerCase();
  const role    = ROLE_MAP[roleKey];
  const router  = useRouter();
  const { login } = useAuth();

  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [next, setNext]         = useState('');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('next');
    if (p && p.startsWith('/')) setNext(p);
  }, []);

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">Unknown role.</p>
          <Link href="/login" className="underline text-yellow-400">Back to sign-in</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await login(phone, password, role, next || DASH[role]);
    if (!res.success) { setError(res.error); setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-yellow-900/40 p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 md:p-10"
      >
        <h1 className="text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-yellow-500 mb-1 capitalize">
          {roleKey} Login
        </h1>
        <p className="text-center text-gray-300 text-sm mb-6">Welcome back to Gold Centro</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Phone Number</label>
            <input
              type="tel" required value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Password</label>
            <input
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-yellow-500/50 transition-all disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link href={`/forgot-password/${roleKey}`} className="text-yellow-300 hover:underline">
            Forgot password?
          </Link>
          <Link href={`/register/${roleKey}`} className="text-gray-300 hover:underline">
            Create account
          </Link>
        </div>
      </motion.div>
    </div>
  );
}