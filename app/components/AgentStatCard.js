'use client';

import { motion } from 'framer-motion';

export default function AgentStatCard({ label, value, icon: Icon, color = 'yellow', subtitle }) {
  const colorMap = {
    yellow: 'from-yellow-400 to-amber-500 text-black',
    blue: 'from-blue-500 to-blue-600 text-white',
    green: 'from-green-500 to-green-600 text-white',
    purple: 'from-purple-500 to-purple-600 text-white',
    red: 'from-red-500 to-red-600 text-white',
    gray: 'from-gray-100 to-gray-200 text-gray-800',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colorMap[color]} rounded-2xl shadow-lg p-5`}
    >
      <div className="flex items-start justify-between">
        {Icon && <Icon className="w-8 h-8 opacity-80" />}
      </div>
      <p className="text-sm mt-3 opacity-90">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
    </motion.div>
  );
}