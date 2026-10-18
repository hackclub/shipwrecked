'use client';

import { useContext } from 'react';
import { ScrollProgressContext } from './Story';
import { AnimatePresence, motion } from 'motion/react';
import TriggerButton from './TriggerButton';
import Image from 'next/image';
// import { motion } from "motion/react";

// 0.45 - 0.55
export default function Info({
  start,
  end,
  previous,
  next,
}: {
  start: number;
  end: number;
  previous: number;
  next: number;
}) {
  const [scrollPercent, scrollToPercent] = useContext(ScrollProgressContext);

  const middle = start + (end - start) / 2;

  return (
    <div className="fixed inset-0 z-0">
      <div
        className="h-screen w-screen aspect-video flex "
        style={{
          backgroundImage: `url('/hut.webp')`,
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
        }}
      >
        <div className="w-screen h-screen flex flex-col items-start justify-center p-8 relative text-dark-brown">
          <div className="bg-sand/60 border border-sand p-6 rounded-md w-full max-w-4xl backdrop-blur-md">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              What&apos;s Hack Club Shipwrecked?
            </h1>

            <AnimatePresence>
              {/* 0.45 - 0.50 */}
              {scrollPercent < middle && (
                <motion.p
                  key="summary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-base md:text-lg py-2"
                >
                  On <span className="font-bold">August 8-11</span>, you and 130 other students will
                  gather on{' '}
                  <span className="font-bold">Cathleen Stone Island in the Boston Harbor</span> for
                  a once in a lifetime,{' '}
                  <span className="font-bold">4-day story-based hackathon</span>!
                  <br />
                  <br />
                  As soon as you get there, you&apos;ll all start working together to survive on the
                  island you&apos;ve been stranded on.
                </motion.p>
              )}

              {/* 0.5 - 0.55 */}
              {scrollPercent >= middle && (
                <motion.p
                  key="agenda"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-base md:text-lg py-2"
                >
                  Once we&apos;re on the island, everyone will work in smaller groups and complete
                  quests. These will be centered around interacting with the world around you:
                  helping the island dwellers develop software or hardware projects that help them
                  sell their produce, helping the pirates plan their routes more effectively, or
                  building projects to help your fellow shipwreck-mates organize your efforts more
                  effectively.{' '}
                  <em>
                    (Not literally, of course... there are no pirates or island dwellers in the
                    Boston Harbor. This is similar to Dungeons & Dragons!)
                  </em>
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="mt-5">
            {scrollPercent < middle && (
              <div className="flex gap-4">
                <TriggerButton targetPercent={previous} backwards waves></TriggerButton>
                <TriggerButton targetPercent={middle + 0.01}>
                  What will we do on the island?
                </TriggerButton>
              </div>
            )}
            {scrollPercent >= middle && (
              <div className="flex gap-4">
                <TriggerButton targetPercent={middle - 0.01} backwards></TriggerButton>
                <TriggerButton targetPercent={next} waves>
                  How do I get invited?
                </TriggerButton>
              </div>
            )}
          </div>

          <button
            className="md:hidden absolute top-5 bottom-auto left- text-6xl"
            onClick={() => {
              scrollToPercent(next);
            }}
          >
            <Image width={80} height={80} src="/back-arrow.png" alt="arrow" className="w-20 h-20" />
          </button>
        </div>
      </div>
    </div>
  );
}
