'use client';

import { useState, useEffect, useRef,  Fragment } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { getSocket } from '../lib/socket';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { FaCoins, FaHandHoldingUsd, FaSearch, FaHandshake } from 'react-icons/fa';
import AnimatedCounter from './components/AnimatedCounter';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function HomePage() {
  const { user, setUser } = useAuth(); // Added setUser from context
  // ---- State ----
  const [rate, setRate] = useState(null);
  const [weight, setWeight] = useState('');
  const [purity, setPurity] = useState('24K');
  const [estimated, setEstimated] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('FORM');
  const [orderId, setOrderId] = useState(null);
  const [qrSecret, setQrSecret] = useState(null);
  const router = useRouter();

  // ---- Login Modal State ----
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // ---- Animation state ----
  const [sellVisible, setSellVisible] = useState(false);
  const sellRef = useRef(null);
  const [particles, setParticles] = useState([]);

  // ---- Fetch rate & socket ----
  // ---- Fetch rate & socket ----
useEffect(() => {
  fetch('/api/rates/current')
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        setRate(data.rate);
        // default purity = first available karat from rates JSON
        const keys = Object.keys(data.rate?.rates || {});
        if (keys.length > 0) setPurity(keys[0]);
      } else {
        toast.error('Failed to load rates');
      }
    })
    .catch(() => toast.error('Network error'));

  const socket = getSocket();
  socket.emit('join-room', 'customer');
  socket.on('rate-updated', (newRate) => {
    setRate(newRate);
    toast.success('Admin updated the gold rate!', { icon: '📈' });
  });
  return () => socket.off('rate-updated');
}, []);

  // ---- Generate particle positions ----
  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 8,
      duration: 8 + Math.random() * 10,
    }));
    setParticles(newParticles);
  }, []);

  // ---- Intersection Observer ----
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target === sellRef.current) {
            setSellVisible(true);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );
    if (sellRef.current) observer.observe(sellRef.current);
    return () => observer.disconnect();
  }, []);

  // ---- Business logic ----
  const calculateEstimate = () => {
  if (!rate || !rate.rates || !weight) return;
  const pricePerGram = rate.rates[purity] || 0;
  setEstimated(parseFloat(weight) * pricePerGram);
};

  // ---- Proceed with sell after login ----
  // ---- Proceed with sell after login ----
const proceedWithSell = async (userId) => {
  setLoading(true);
  setError('');
  try {
    const createRes = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: userId, // <-- now using the passed userId
        weight: parseFloat(weight),
        purity,
        estimatedTotal: estimated,
        lat: 28.6139,
        lng: 77.2090,
      }),
    });
    const createData = await createRes.json();
    if (!createRes.ok) throw new Error(createData.error);

    setOrderId(createData.order.id);
    setQrSecret(createData.order.qrSecret);

    const otpRes = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const otpData = await otpRes.json();
    if (!otpRes.ok) throw new Error(otpData.error);

    setStep('OTP');
    window._tempOrderId = createData.order.id;
    toast.success(`Dummy OTP: ${otpData.dummyCode || '123456'}`, { duration: 10000 });
  } catch (err) {
    setError(err.message);
    toast.error(err.message);
  } finally {
    setLoading(false);
  }
};

  // ---- Handle Sell button ----
 const handleSell = async () => {
  if (!user) {
    setShowLoginModal(true);
    return;
  }
  await proceedWithSell(user.id);
};

  // ---- Login & then sell ----
  const handleLoginAndSell = async (e) => {
  e.preventDefault();
  setLoginLoading(true);
  setLoginError('');
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: loginPhone, name: loginName, role: 'CUSTOMER' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    // Update AuthContext
    setUser(data.user);

    setShowLoginModal(false);
    setLoginName('');
    setLoginPhone('');
    // Proceed with sell using the newly logged-in user's ID
    await proceedWithSell(data.user.id);
  } catch (err) {
    setLoginError(err.message);
  } finally {
    setLoginLoading(false);
  }
};

  // ---- Verify OTP ----
 const verifyOtp = async (code) => {
  setLoading(true);
  try {
    // 1. Get orderId from multiple sources
    const orderId = window._tempOrderId || sessionStorage.getItem('pendingOrderId');
    if (!orderId) {
      throw new Error('Order ID missing. Please restart the sell process.');
    }

    // 2. Ensure user is available
    if (!user || !user.id) {
      throw new Error('User not logged in. Please login again.');
    }

    // 3. Debug: log the payload
    console.log('🔍 Verifying OTP with:', { userId: user.id, code, orderId });

    const res = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        code,
        orderId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Verification failed');

    // Clear session storage after success
    sessionStorage.removeItem('pendingOrderId');

    // Emit socket event to admin
    // const socket = getSocket();
    // socket.emit('new-order', { orderId });

    setStep('SUCCESS');
    toast.success('Order placed! Admin will assign an agent.', { icon: '🎉' });
  } catch (err) {
    setError(err.message);
    toast.error(err.message);
  } finally {
    setLoading(false);
  }
};
  // ---- Card data ----
  const cardData = [
    { id: 1, title: 'Trusted Since 1990', desc: 'Over 30 years of transparent dealings.' },
    { id: 2, title: 'Best Prices', desc: 'We pay the highest rate for your old gold.' },
    { id: 3, title: 'Instant Payment', desc: 'Get paid immediately after verification.' },
    { id: 4, title: 'Free Home Visit', desc: 'Our agent comes to your doorstep at no extra cost.' },
    { id: 5, title: 'Accurate Purity Test', desc: 'State-of-the-art testing equipment.' },
    { id: 6, title: '100% Secure', desc: 'All transactions are safe and confidential.' },
  ];

  // ---- Render OTP step ----
  if (step === 'OTP') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-100 p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-white/20"
        >
          <h2 className="text-3xl font-bold text-black">Enter OTP</h2>
          <p className="text-sm text-gray-500 mt-1">We sent a code to your registered number</p>
          <p className="text-xs text-amber-500 mt-1">Dummy: 123456</p>
          <div className="mt-6 flex justify-center gap-3" id="otp-container">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <input
                key={i}
                type="text"
                maxLength="1"
                className="w-12 h-14 border-2 border-gray-300 rounded-xl text-center text-2xl font-bold focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const next = e.target.nextElementSibling;
                    if (next) next.focus();
                  }
                  const container = document.getElementById('otp-container');
                  const inputs = container.querySelectorAll('input');
                  const fullCode = Array.from(inputs).map((inp) => inp.value).join('');
                  if (fullCode.length === 6) verifyOtp(fullCode);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !e.target.value) {
                    const prev = e.target.previousElementSibling;
                    if (prev) prev.focus();
                  }
                }}
              />
            ))}
          </div>
          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-6 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition"
            onClick={() => {
              const container = document.getElementById('otp-container');
              const inputs = container.querySelectorAll('input');
              const code = Array.from(inputs).map((inp) => inp.value).join('');
              if (code.length === 6) verifyOtp(code);
            }}
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </motion.button>
        </motion.div>
        <Toaster position="top-center" />
      </div>
    );
  }

  // ---- SUCCESS step with QR ----
  if (step === 'SUCCESS') {
    const qrData = JSON.stringify({ orderId, secret: qrSecret });

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="bg-white/90 backdrop-blur-md p-8 md:p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center border border-white/20"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.6 }}
            className="text-6xl mb-4"
          >
            ✅
          </motion.div>
          <h2 className="text-3xl font-bold text-green-600">Order Placed Successfully!</h2>
          <p className="text-gray-600 mt-2">Our team will contact you shortly.</p>

          <div className="mt-6 flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-2">
              <span className="font-semibold">Order ID:</span> {orderId?.slice(-8) || 'N/A'}
            </p>
            <div className="bg-white p-4 rounded-2xl shadow-xl border-2 border-yellow-300 inline-block">
              {qrSecret && orderId ? (
                <QRCode
                  value={qrData}
                  size={200}
                  level="H"
                  includeMargin
                  className="rounded-lg"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-200 animate-pulse rounded-lg" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3 max-w-xs">
              📱 Please keep this screen open. Our agent will scan this QR code upon arrival.
            </p>
            <button
              onClick={() => {
                if (orderId) {
                  navigator.clipboard.writeText(orderId);
                  toast.success('Order ID copied!');
                }
              }}
              className="mt-2 text-sm text-blue-500 underline hover:text-blue-700"
            >
              Copy Order ID
            </button>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setStep('FORM');
                setOrderId(null);
                setQrSecret(null);
                setWeight('');
                setEstimated(0);
                localStorage.removeItem('goldOrder');
              }}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition"
            >
              Back to Home
            </motion.button>

           <motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  onClick={() => {
    // keep the order/QR info so the /order page can read it
    if (orderId && qrSecret) {
      localStorage.setItem(
        'goldOrder',
        JSON.stringify({ orderId, qrSecret })
      );
    }
    toast.success('Opening your QR…');
    router.push('/orders');
  }}
  className="bg-gray-200 text-gray-700 px-4 py-3 rounded-full font-medium hover:bg-gray-300 transition"
>
  View QR
</motion.button>
          </div>
        </motion.div>
        <Toaster position="top-center" />
      </div>
    );
  }

  // ---- Main layout (FORM) ----
  return (
    <div className="bg-white text-black overflow-x-hidden">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

      {/* ===== RATE TICKER ===== */}
      {rate && rate.rates && (
  <div className="w-full bg-black text-yellow-400 py-3 overflow-hidden whitespace-nowrap">
    <motion.div
      className="inline-block"
      animate={{ x: ['100%', '-100%'] }}
      transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
    >
      <span className="mx-8 font-bold text-sm md:text-base">
        💰{' '}
        {Object.entries(rate.rates).map(([karat, value], i) => (
          <Fragment key={karat}>
            {i > 0 && <>&nbsp;|&nbsp;</>}
            {karat}: ₹{value}/gm
          </Fragment>
        ))}
        &nbsp;|&nbsp; Gold Centro – Best Prices, Transparent Dealings
      </span>
    </motion.div>
  </div>
)}

      {/* ===== HERO ===== */}
      <section className="relative w-full h-screen md:h-[90vh] overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover"
          src="/videos/godcentro.mp4"
          poster="/images/gcenro_banner1.png"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70 flex flex-col items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-2xl">
              Gold Centro
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-lg md:text-2xl text-white/90 mt-4 max-w-2xl"
          >
            The most trusted name for selling old gold. Get the best price with complete transparency.
          </motion.p>
          <motion.a
            href="#sell-section"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.08, boxShadow: '0 0 30px rgba(251, 191, 36, 0.5)' }}
            whileTap={{ scale: 0.95 }}
            className="mt-8 inline-block bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-10 py-5 rounded-full text-lg shadow-2xl transition-all duration-300"
          >
            Sell Your Gold Now
          </motion.a>
        </div>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-yellow-400/20"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
              }}
              animate={{
                y: [0, -30, 30, -20, 20, 0],
                x: [0, 20, -20, 10, -10, 0],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </section>

      {/* ===== SELL SECTION – TWO-COLUMN ===== */}
      <section
        id="sell-section"
        ref={sellRef}
        className="w-full bg-gradient-to-br from-yellow-50 via-white to-amber-50 py-20 px-4 md:px-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={sellVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
        >
          {/* LEFT – Form */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={sellVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative z-10"
          >
            <div className="text-left mb-8">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={sellVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-5xl font-bold text-black inline-block border-b-4 border-yellow-500 pb-2"
              >
                Sell Your Gold
              </motion.h2>
              <p className="text-gray-600 mt-3 text-lg">
                Get an instant estimate – our agent will visit you at your convenience.
              </p>
            </div>

            {rate && rate.rates && (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={sellVisible ? { opacity: 1, scale: 1 } : {}}
    transition={{ delay: 0.4 }}
    className="bg-yellow-100/80 backdrop-blur-sm p-4 rounded-2xl border-l-4 border-yellow-600 mb-6 flex items-center gap-4 shadow-lg"
  >
    <span className="text-3xl">📈</span>
    <div>
      <p className="text-sm text-gray-700">Today's Buying Rate</p>
      <p className="text-lg font-bold text-yellow-700 flex flex-wrap items-center gap-x-2 gap-y-1">
        {Object.entries(rate.rates).map(([karat, value], i) => (
          <Fragment key={karat}>
            {i > 0 && <span className="text-gray-400">|</span>}
            <span>{karat}:</span>
            <span className="inline-flex items-center gap-1">
              ₹
              <AnimatedCounter
                key={`${karat}-${value}`}
                value={value}
                className="text-amber-600 font-black text-xl"
              />
              <span className="text-sm font-normal text-gray-600">/gm</span>
            </span>
          </Fragment>
        ))}
      </p>
      {rate.serviceChargePercent > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          Service charge: {rate.serviceChargePercent}%
        </p>
      )}
    </div>
  </motion.div>
)}

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={sellVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5 }}
              className="bg-white/90 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-2xl border border-white/30 hover:shadow-3xl transition-shadow duration-500"
            >
              {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purity</label>
                  <select
  value={purity}
  onChange={(e) => setPurity(e.target.value)}
  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all"
>
  {rate?.rates
    ? Object.keys(rate.rates).map((karat) => (
        <option key={karat} value={karat}>
          {karat}
        </option>
      ))
    : (
      <>
        <option>24K</option>
        <option>22K</option>
      </>
    )}
</select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (grams)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    onKeyUp={calculateEstimate}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all"
                    placeholder="e.g. 10"
                  />
                </div>

                {estimated > 0 && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-xl text-center border border-green-200"
                  >
                    <p className="text-sm text-gray-600">Estimated Total</p>
                    <p className="text-4xl font-bold text-green-700">₹{estimated.toFixed(2)}</p>
                  </motion.div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(251, 191, 36, 0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSell}
                  disabled={loading || !estimated}
                  className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold p-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-black" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Confirm Sell'
                  )}
                </motion.button>

                {!user && (
                  <p className="text-center text-sm text-blue-600 mt-2">
                    <a href="/login" className="underline hover:text-blue-800">Login</a> to sell your gold.
                  </p>
                )}
              </div>
            </motion.div>

            <div className="mt-6 text-center text-sm text-gray-500 flex justify-center gap-6 flex-wrap">
              <span className="flex items-center gap-1">🔒 Secure</span>
              <span className="flex items-center gap-1">⚡ Instant</span>
              <span className="flex items-center gap-1">🏠 Free Home Visit</span>
            </div>
          </motion.div>

          {/* RIGHT – Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={sellVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="relative z-10 flex justify-center items-center"
          >
            <div className="relative w-full max-w-lg mx-auto">
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.6, 0.8, 0.6],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute -inset-8 rounded-full bg-yellow-300/30 blur-2xl"
              />
              <motion.div
                animate={{
                  y: [0, -15, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20"
              >
                <Image
                  src="/images/gcentro_mul.png"
                  alt="Gold Centro Sell"
                  width={600}
                  height={500}
                  className="object-cover w-full h-auto"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={sellVisible ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
                className="absolute -bottom-4 -right-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl px-4 py-2 border border-yellow-200 flex items-center gap-2"
              >
                <span className="text-2xl">⭐</span>
                <div>
                  <p className="text-xs text-gray-600">Trusted by</p>
                  <p className="text-sm font-bold text-black">10,000+ Customers</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={sellVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.9 }}
                className="absolute -top-4 -left-4 bg-green-500 text-white rounded-full px-3 py-1 text-xs font-bold shadow-lg"
              >
                Best Price Guarantee
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ===== BANNER IMAGE ===== */}
      <section className="w-full bg-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="relative w-full aspect-[21/9] md:aspect-[21/7] overflow-hidden"
        >
          <Image
            src="/images/gcentro_banner1.png"
            alt="Gold Centro Banner"
            fill
            className="object-contain hover:scale-105 transition-transform duration-700"
            priority
            sizes="100vw"
          />
        </motion.div>
      </section>

      {/* ===== ABOUT SECTION ===== */}
      <section className="w-full px-4 py-16 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 relative"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-black inline-block relative pb-2">
              Who We Are
              <motion.span
                className="absolute bottom-0 left-0 h-1 bg-yellow-500 rounded-full"
                initial={{ width: 0 }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-gray-600 mt-4 text-lg max-w-2xl mx-auto"
            >
              Gold Centro is a premier old gold purchasing company, dedicated to giving you the best value with complete transparency.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.15, delayChildren: 0.1 },
              },
            }}
          >
            {/* Block 1 */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 50, scale: 0.9 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: 'spring', stiffness: 120, damping: 15 },
                },
              }}
              whileHover={{
                y: -12,
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)',
                transition: { duration: 0.2 },
              }}
              className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-yellow-100 group"
            >
              <motion.div
                className="text-5xl text-yellow-600 mb-4 inline-block"
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                whileHover={{ scale: 1.2, rotate: 5 }}
              >
                <FaCoins />
              </motion.div>
              <h3 className="text-2xl font-bold text-black mb-2">Old Gold Purchasing</h3>
              <p className="text-gray-700">
                We specialise in buying all forms of old gold – jewellery, coins, bars, and scrap. No item is too small or too large.
              </p>
              <motion.div
                className="mt-4 h-0.5 w-0 bg-yellow-500 group-hover:w-full transition-all duration-500"
                initial={{ width: 0 }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true }}
              />
            </motion.div>

            {/* Block 2 */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 50, scale: 0.9 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: 'spring', stiffness: 120, damping: 15 },
                },
              }}
              whileHover={{
                y: -12,
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)',
                transition: { duration: 0.2 },
              }}
              className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-yellow-100 group"
            >
              <motion.div
                className="text-5xl text-green-600 mb-4 inline-block"
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut', delay: 0.4 }}
                whileHover={{ scale: 1.2, rotate: -5 }}
              >
                <FaHandHoldingUsd />
              </motion.div>
              <h3 className="text-2xl font-bold text-black mb-2">Best Value Guaranteed</h3>
              <p className="text-gray-700">
                We offer the highest market rates with real‑time pricing. Our advanced purity testing ensures you get exactly what your gold is worth.
              </p>
              <motion.div
                className="mt-4 h-0.5 w-0 bg-yellow-500 group-hover:w-full transition-all duration-500"
                initial={{ width: 0 }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true }}
              />
            </motion.div>

            {/* Block 3 */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 50, scale: 0.9 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: 'spring', stiffness: 120, damping: 15 },
                },
              }}
              whileHover={{
                y: -12,
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)',
                transition: { duration: 0.2 },
              }}
              className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-yellow-100 group"
            >
              <motion.div
                className="text-5xl text-blue-600 mb-4 inline-block"
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut', delay: 0.8 }}
                whileHover={{ scale: 1.2, rotate: 5 }}
              >
                <FaSearch />
              </motion.div>
              <h3 className="text-2xl font-bold text-black mb-2">100% Transparent</h3>
              <p className="text-gray-700">
                From weighing to purity checks to final payment, every step is open and explained. No hidden charges, no fine print – just trust.
              </p>
              <motion.div
                className="mt-4 h-0.5 w-0 bg-yellow-500 group-hover:w-full transition-all duration-500"
                initial={{ width: 0 }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true }}
              />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
            whileHover={{
              background: 'linear-gradient(135deg, #fef3c7, #fcd34d)',
              transition: { duration: 0.3 },
            }}
            className="mt-12 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-2xl p-6 md:p-8 text-center shadow-lg border border-yellow-200"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="flex flex-col md:flex-row items-center justify-center gap-4"
            >
              <span className="text-5xl text-purple-600">
                <FaHandshake />
              </span>
              <div>
                <h4 className="text-xl font-bold text-black">Customer First – Always</h4>
                <p className="text-gray-700 max-w-2xl mx-auto">
                  Our experienced team guides you through the entire process, ensuring you feel confident and satisfied with every transaction.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== WHY GOLD CENTRO (cards) ===== */}
      <section className="w-full px-4 py-16 bg-gradient-to-b from-yellow-50 to-white">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center text-yellow-600 mb-2"
          >
            Why Gold Centro?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-center text-gray-600 mb-12 text-lg"
          >
            We redefine trust and transparency in gold buying.
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {cardData.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: index * 0.08, duration: 0.5, ease: 'easeOut' }}
                whileHover={{
                  y: -12,
                  scale: 1.02,
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition-all duration-300 group"
              >
                <div className="relative h-56 w-full overflow-hidden bg-amber-100">
                  <Image
                    src={`/images/cards/card${card.id}.png`}
                    alt={card.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-black mb-2">{card.title}</h3>
                  <p className="text-gray-600 text-sm">{card.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="w-full bg-black text-white py-12 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto text-center"
        >
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-sm">
            <span>© {new Date().getFullYear()} Gold Centro. All rights reserved.</span>
            <span className="hidden md:inline">|</span>
            <span>📞 +91 98765 43210</span>
            <span className="hidden md:inline">|</span>
            <span>✉️ info@goldcentro.com</span>
          </div>
          <p className="text-gray-400 text-xs mt-4">Transparent • Secure • Best Prices</p>
        </motion.div>
      </footer>

      {/* ===== LOGIN MODAL ===== */}
      {showLoginModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowLoginModal(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLoginModal(false)}
              className="float-right text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-black mb-2">Login to Sell</h2>
            <p className="text-gray-500 text-sm mb-6">Enter your details to continue</p>

            <form onSubmit={handleLoginAndSell} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl p-3 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl p-3 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition"
                  placeholder="e.g. 9876543210"
                  required
                />
              </div>
              {loginError && (
                <p className="text-red-500 text-sm">{loginError}</p>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold p-3 rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-50"
              >
                {loginLoading ? 'Logging in...' : 'Continue'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}

      <style jsx>{`
        .shadow-3xl {
          box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.3);
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}