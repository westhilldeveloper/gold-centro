'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import OtpInput from '../../components/OtpInput';

const ROLE_MAP = { customer: 'CUSTOMER', agent: 'AGENT', admin: 'ADMIN' };

export default function ForgotPasswordPage() {
  const params  = useParams();
  const roleKey = String(params?.role || '').toLowerCase();
  const role    = ROLE_MAP[roleKey];
  const router  = useRouter();

  const [step, setStep]       = useState('PHONE'); // PHONE | OTP | PASSWORD
  const [phone, setPhone]     = useState('');
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

  const sendOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send OTP');
      setStep('OTP');
      toast.success(data.dummyCode ? `DEV OTP: ${data.dummyCode}` : 'If registered, an OTP was sent');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (code) => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setStep('PASSWORD');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword: confirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not reset password');
      toast.success('Password updated. Please login.');
      router.push(`/login/${roleKey}`);
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
        <h1 className="text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-yellow-500 mb-1">
          Reset password
        </h1>
        <p className="text-center text-gray-300 text-sm mb-6 capitalize">{roleKey} account</p>

        {step === 'PHONE' && (
          <form onSubmit={sendOtp} className="space-y-4">
            <input
              type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="Registered mobile number"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold py-3.5 rounded-xl disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'OTP' && (
          <div className="space-y-4">
            <p className="text-center text-gray-300 text-sm">Enter the code sent to your mobile</p>
            <OtpInput disabled={loading} onComplete={verifyOtp} />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            {loading && <p className="text-center text-yellow-300 text-sm">Verifying…</p>}
          </div>
        )}

        {step === 'PASSWORD' && (
          <form onSubmit={resetPassword} className="space-y-4">
            <input
              type="password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
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
              {loading ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-300">
          <Link href={`/login/${roleKey}`} className="text-yellow-300 hover:underline">
            Back to login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}