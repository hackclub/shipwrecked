'use client';

import {useEffect, useState} from 'react';


export default function TimeDiff({label, suffix, scheduled, actual, omitSeconds = true}: {
  label: string,
  suffix: string,
  scheduled: number,
  actual: number,
  omitSeconds?: boolean
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Check for early or late
  const diff = actual - scheduled;
  const isEarly = diff <= 0;
  const absDiff = Math.abs(diff);
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);
  let diffText = `${hours > 0 ? `${hours}h ` : ''}${minutes > 0 ? `${minutes}m ` : ''}${(!omitSeconds && seconds > 0) ? `${seconds}s` : ''}`.trim();
  if (diffText) {
    diffText = `${isEarly ? 'early' : 'late'} by ${diffText}`;
  } else {
    diffText = 'on time';
  }

  // Get time remaining
  const remainingDiff = Math.abs(actual - now);
  const remainingHours = Math.floor(remainingDiff / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((remainingDiff % (1000 * 60 * 60)) / (1000 * 60));
  const remainingSeconds = Math.floor((remainingDiff % (1000 * 60)) / 1000);
  const remainingText = `${remainingHours > 0 ? `${remainingHours}h ` : ''}${remainingMinutes > 0 ? `${remainingMinutes}m ` : ''}${(!omitSeconds && remainingSeconds > 0) ? `${remainingSeconds}s` : ''}`;

  return (
    <div className="text-sm">
      {label} <span className="font-bold text-black">{remainingText}</span> {suffix}<br/>
      <span className={(isEarly ? 'text-green-700' : 'text-red-700') + ' text-xs'}>({diffText})</span>
    </div>
  );
}