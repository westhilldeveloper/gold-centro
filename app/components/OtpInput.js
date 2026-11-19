'use client';
import { useRef } from 'react';

export default function OtpInput({ length = 6, disabled, onComplete }) {
  const refs   = useRef([]);
  const values = useRef(Array(length).fill(''));

  const handleChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    values.current[i] = digit;
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
    const code = values.current.join('');
    if (code.length === length) onComplete?.(code);
  };

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !values.current[i] && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          className="w-11 h-13 md:w-12 md:h-14 border-2 border-white/20 bg-white/10 rounded-xl text-center text-2xl font-bold text-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 outline-none transition-all"
        />
      ))}
    </div>
  );
}