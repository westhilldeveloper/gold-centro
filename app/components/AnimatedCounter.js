import { useState, useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

const AnimatedCounter = ({ value, className = '' }) => {
  const [isPop, setIsPop] = useState(false);
  
  // Create a spring that starts at 0
  const spring = useSpring(0, { damping: 15, stiffness: 100 });
  // Round the animated value
  const rounded = useTransform(spring, (latest) => Math.round(latest));

  // Reset and animate when `value` changes
  useEffect(() => {
    setIsPop(false);
    // Instantly reset to 0 (no animation)
    spring.jump(0);
    // Then animate to the new target after a tiny delay
    const timer = setTimeout(() => {
      spring.set(value);
    }, 50);
    return () => clearTimeout(timer);
  }, [value, spring]);

  // Trigger pop effect when count reaches target
  useEffect(() => {
    const unsubscribe = spring.onChange((latest) => {
      if (latest === value && value !== 0 && !isPop) {
        setIsPop(true);
        setTimeout(() => setIsPop(false), 1000);
      }
    });
    return () => unsubscribe();
  }, [spring, value, isPop]);

  return (
    <motion.span
      className={className}
      animate={isPop ? { scale: 1.2, color: '#b45309' } : { scale: 1, color: 'inherit' }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
    >
      {rounded}
    </motion.span>
  );
};

export default AnimatedCounter;