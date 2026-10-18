'use client';

import { useContext } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ScrollProgressContext } from './Story';
import Form from '@/app/rsvp/form';
import SignupProgress from '@/components/common/SignupProgress';
import { PrefillData } from '@/types/prefill';

// import { motion } from "motion/react";
export default function CallToAction({
  previous,
  prefillData,
}: {
  previous: number;
  prefillData: PrefillData;
}) {
  const [, scrollToPercent] = useContext(ScrollProgressContext);

  return (
    <div className="fixed inset-0 z-0">
      <div
        className="h-screen w-screen aspect-video flex"
        style={{
          backgroundImage: `url('/faq.webp')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <button
          className="absolute top-auto md:top-5 md:bottom-auto bottom-3 left-3 text-6xl rotate-90"
          onClick={() => {
            scrollToPercent(previous);
          }}
        >
          <Image
            width={80}
            height={80}
            src="/back-arrow.png"
            alt="arrow"
            className="md:w-20 md:h-20 w-15 h-15"
          />
        </button>
        <div className="w-screen h-screen flex flex-col items-center p-2 sm:p-4">
          <div className="mt-1 sm:mt-4 w-full sm:w-[600px] max-w-4xl">
            <SignupProgress />
          </div>
          <div className="mt-1 sm:mt-4 bg-sky-blue/30 border border-sky-blue p-2 sm:p-4 rounded-md w-full max-w-4xl min-h-[400px] sm:min-h-[500px] backdrop-blur-sm flex flex-col justify-between text-center overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center gap-1 sm:gap-2">
              <Form hasSession={false} prefillData={prefillData} />
            </div>
          </div>
          <div className="text-center px-2 text-sm sm:text-base mt-2">
            <div
              className="inline-block rounded-lg px-4 py-2 shadow-sm border"
              style={{
                background: '#FAEA76',
                borderColor: '#F7DF19',
              }}
            >
              <span className="font-bold" style={{ color: '#007bbd' }}>
                NOTE:
              </span>{' '}
              For more info, see{' '}
              <Link
                className="underline font-semibold"
                href="/info"
                style={{
                  color: '#007bbd',
                  textDecorationColor: '#47D1f6',
                }}
              >
                FAQ&apos;s
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
