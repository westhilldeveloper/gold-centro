'use client';
import Link from 'next/link';

const options = [
  { href: '/login/customer', label: 'Customer', desc: 'Sell your gold' },
  { href: '/login/agent',    label: 'Agent',    desc: 'Manage pickups' },
  { href: '/login/admin',    label: 'Admin',    desc: 'Operations dashboard' },
];

export default function LoginLanding() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-yellow-900/40 p-6">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-yellow-500 mb-8">
          Gold Centro — Sign in
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {options.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              className="bg-white/10 border border-white/20 rounded-2xl p-6 text-white hover:bg-white/15 hover:border-yellow-400/50 transition-all"
            >
              <p className="text-xl font-semibold">{o.label}</p>
              <p className="text-sm text-gray-300 mt-1">{o.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}