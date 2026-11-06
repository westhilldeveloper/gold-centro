'use client';

import { motion } from 'framer-motion';

export default function PlaceholderPage({ title, description, icon: Icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center"
    >
      <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
        {Icon && <Icon className="w-10 h-10 text-yellow-600" />}
      </div>
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      <p className="text-gray-500 mt-2 max-w-md">{description}</p>
      <span className="mt-4 inline-block bg-yellow-100 text-yellow-800 text-xs font-medium px-3 py-1 rounded-full">
        Coming Soon
      </span>
    </motion.div>
  );
}