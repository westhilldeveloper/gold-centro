'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import OtpInput from '../../components/OtpInput';
import { useAuth } from '../../context/AuthContext';

const ROLE_MAP = { customer: 'CUSTOMER', agent: 'AGENT', admin: 'ADMIN' };
const DASH     = { CUSTOMER: '/', AGENT: '/agent', ADMIN: '/admin' };

export default function RegisterPage() {
  const params  = useParams();
  const roleKey = String(params?.role || '').toLowerCase();
  const role    = ROLE_MAP[roleKey];
  const router  = useRouter();
  const { applySession } = useAuth();

  const [step, setStep]       = useState('DETAILS'); // DETAILS | OTP | PASSWORD
  const [phone, setPhone]     = useState('');
  const [name, setName]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">Unknown role.</p>
          <Link href="/login" className="underline text-yellow-400">Back</Link>
        </div>
      </div>
    );
  }

  const startRegistration = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/register/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start registration');
      setStep('OTP');
      toast.success(data.dummyCode ? `DEV OTP: ${data.dummyCode}` : 'OTP sent to your mobile');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (code) => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/register/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setStep('PASSWORD');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/register/set-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword: confirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save password');
      applySession(data.user, data.token);
      toast.success('Account created!');
      router.push(DASH[role] || '/');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-yellow-900/40 p-4">
      <Toaster position="top-center" />
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 md:p-10"
      >
        <h1 className="text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-yellow-500 mb-1 capitalize">
          {roleKey} Registration
        </h1>
        <p className="text-center text-gray-300 text-sm mb-6">
          Step {step === 'DETAILS' ? 1 : step === 'OTP' ? 2 : 3} of 3
        </p>

        {role === 'ADMIN' && (
          <p className="text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-4">
            Admin self-registration is disabled by default. Use the seed script instead.
          </p>
        )}

        {step === 'DETAILS' && (
          <form onSubmit={startRegistration} className="space-y-4">
            <input
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <input
              type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold py-3.5 rounded-xl disabled:opacity-60"
            >
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'OTP' && (
          <div className="space-y-4">
            <p className="text-center text-gray-300 text-sm">
              Enter the 6-digit code sent to +91 {phone}
            </p>
            <OtpInput disabled={loading} onComplete={verifyOtp} />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            {loading && <p className="text-center text-yellow-300 text-sm">Verifying…</p>}
            <button
              type="button" onClick={() => setStep('DETAILS')}
              className="w-full text-gray-300 text-sm hover:underline"
            >
              Change number
            </button>
          </div>
        )}

        {step === 'PASSWORD' && (
          <form onSubmit={savePassword} className="space-y-4">
            <input
              type="password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 chars, letter + number)"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <input
              type="password" required minLength={8} value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold py-3.5 rounded-xl disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Create account'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-300">
          Already have an account?{' '}
          <Link href={`/login/${roleKey}`} className="text-yellow-300 hover:underline">Login</Link>
        </p>
      </motion.div>
    </div>
  );
}