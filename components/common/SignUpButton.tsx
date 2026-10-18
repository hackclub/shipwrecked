'use client';

import Image from 'next/image';
import { useContext } from 'react';
import { ScrollProgressContext } from '../launch/Story';

export default function SignUpButton() {
  const [scrollPercent] = useContext(ScrollProgressContext);
  const bannerOpacity = Math.max(0, Math.min(1, (0.75 - scrollPercent) / 0.1));

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  };

  if (bannerOpacity === 0) return null;

  return (
    <button
      className="fixed top-8 right-8 z-50 py-3 md:px-6 px-4 uppercase bg-dark-blue/80 text-sand border border-sand whitespace-nowrap text-sm md:text-lg transition-all duration-300 hover:border-yellow hover:scale-105 hover:shadow-lg hover:shadow-dark-blue/20 backdrop-blur-sm rounded-full cursor-pointer active:scale-95"
      onClick={scrollToBottom}
      style={{ opacity: bannerOpacity, transition: 'opacity 0.2s ease-out' }}
    >
      <span className="flex items-center gap-3 flex-nowrap">
        RSVP
        <Image
          src="/back-arrow.png"
          width={24}
          height={24}
          alt="next"
          className="w-8 h-8 -scale-x-100 transition-transform duration-300 group-hover:translate-x-1"
        />
      </span>
    </button>
  );
}
