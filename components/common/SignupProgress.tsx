'use client';

import { useEffect, useState } from 'react';
import ProgressBar from './ProgressBar';

export default function SignupProgress() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/stats/count');
        const data = await response.json();
        console.log('client received count', data);
        setCount(data.count);
      } catch (error) {
        console.error('Error fetching signup count:', error);
      }
    };

    // Fetch immediately
    fetchCount();

    // Then fetch every 10 seconds
    const interval = setInterval(fetchCount, 10000);

    return () => clearInterval(interval);
  }, []);

  if (count === null) return null;

  const progress = Math.min((count / 5000) * 100, 100);

  return (
    <div className="bg-sand/60 border border-sand p-4 rounded-md backdrop-blur-md text-dark-brown mb-4">
      <h2 className="text-2xl font-bold mb-2">🎉 Submit your projects to Shipwrecked!</h2>
      <p className="text-sm sm:text-base">
        Shipwrecked has now kicked off. Check your inbox for further instructions after you join.
        Signups are still open.
      </p>
    </div>
  );
}
