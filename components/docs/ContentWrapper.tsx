'use client';
import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';

export default function ContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.3 } }}
    >
      {children}
    </motion.div>
  );
}
