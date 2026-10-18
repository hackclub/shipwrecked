'use client';

import { useEffect } from 'react';
import Image from 'next/image';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="fixed inset-0 bg-sky-blue/30 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white/80 p-8 rounded-lg shadow-lg text-center max-w-md">
        <h1 className="text-6xl font-bold text-dark-blue mb-4">OOPS!</h1>
        <p className="text-lg text-dark-blue/80 mb-6">
          Something went wrong. Don't worry, our crew is working on it!
        </p>
        <button
          onClick={reset}
          className="py-2 px-4 uppercase bg-dark-blue/60 text-sand border border-sand whitespace-nowrap text-base transition hover:border-yellow hover:scale-105 hover:shadow-lg hover:shadow-dark-blue/20 backdrop-blur-sm rounded-full cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
