// app/components/AgentStatCard.jsx
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
    orange: 'from-orange-400 to-orange-500 text-black',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      // Added min-w-0 and overflow-hidden to prevent grid blowout
      className={`bg-gradient-to-br ${colorMap[color] || colorMap.yellow} rounded-2xl shadow-lg p-4 md:p-5 flex flex-col justify-between h-full min-w-0 overflow-hidden`}
    >
      <div>
        <div className="flex items-start justify-between">
          {Icon && <Icon className="w-5 h-5 md:w-8 md:h-8 opacity-80" />}
        </div>
        {/* Replaced truncate with line-clamp for safety */}
        <p className="text-[11px] md:text-sm mt-2 md:mt-3 opacity-90 font-medium line-clamp-2 leading-tight">
          {label}
        </p>
        {/* Added break-words and reduced text size on mobile */}
        <p className="text-xl md:text-3xl font-bold mt-1 break-words leading-tight">
          {value}
        </p>
      </div>
      {subtitle && (
        <p className="text-[10px] md:text-xs opacity-75 mt-1 md:mt-2 truncate">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}