'use client';

import { useContext } from 'react';
import { ScrollProgressContext } from './Story';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import TriggerButton from './TriggerButton';

// import { motion } from "motion/react";

export default function Bay({
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
  const [scrollPercent] = useContext(ScrollProgressContext);

  const startWithWaveOffset = start + 0.075;
  const endWithWaveOffset = end - 0.075;

  const duration = endWithWaveOffset - startWithWaveOffset;

  const subsections = {
    intro: { start: start, end: startWithWaveOffset + (duration * 1) / 3 },
    viral: {
      start: startWithWaveOffset + (duration * 1) / 3,
      end: startWithWaveOffset + (duration * 2) / 3,
    },
    teamwork: { start: startWithWaveOffset + (duration * 2) / 3, end: endWithWaveOffset },
  };

  return (
    <div className="fixed inset-0 z-0">
      <div
        className="h-screen w-screen aspect-video flex"
        style={{
          backgroundImage: `url('/bay.webp')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
        }}
      >
        <div className="absolute top-8 right-8 z-50">
          <TriggerButton targetPercent={1} waves>
            Sign up
          </TriggerButton>
        </div>
        <div className="w-screen h-screen flex flex-col items-end justify-end p-8 md:pb-20 relative">
          <div className="bg-sand/60 border border-sand p-6 rounded-md w-full max-w-4xl backdrop-blur-md text-dark-brown">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              {scrollPercent < subsections.viral.start
                ? 'The Bay, Part 1'
                : scrollPercent < subsections.teamwork.start
                  ? 'The Bay, Part 2'
                  : 'The Bay, Part 3'}
            </h1>

            <AnimatePresence>
              {scrollPercent < subsections.intro.end && (
                <motion.p
                  key="bay-intro"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-base md:text-xl py-2"
                >
                  Through <span className="font-bold">The Bay</span>, you&apos;ll earn an invitation
                  to Shipwrecked. In The Bay, you will spend 60 hours making 4 projects (about 15
                  hours each) with the goal of making them{' '}
                  <span className="font-bold">go viral</span>.
                </motion.p>
              )}

              {/* 0.5 - 0.55 */}
              {scrollPercent >= subsections.viral.start &&
                scrollPercent < subsections.viral.end && (
                  <motion.p
                    key="viral-criteria"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-base md:text-xl py-2"
                  >
                    Going viral means making really polished projects you are extremely proud of,
                    which you then promote to get other people to check it out! You can find the
                    criteria for virality{' '}
                    <Link href="/info/go-viral" className="link">
                      here
                    </Link>
                    . Once you reach 60 hours, ship 4 projects & one of your projects has gone
                    viral, you&apos;ll receive an invitation to Shipwrecked!
                  </motion.p>
                )}

              {/* 0.55 - 0.60 */}
              {scrollPercent >= subsections.teamwork.start && (
                <motion.p
                  key="teamwork"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-base md:text-xl py-2"
                >
                  Every week, you can meet up with your friends either in person or over{' '}
                  <Link href="https://pier.hackclub.com" className="link">
                    The Pier
                  </Link>
                  , our video game-like digital meeting space to work!
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="mt-5">
            {scrollPercent < subsections.intro.end && (
              <div className="flex gap-4">
                <TriggerButton targetPercent={previous - 0.3} backwards waves></TriggerButton>
                <TriggerButton targetPercent={subsections.viral.start + 0.01}>
                  What is &quot;going viral?&quot;
                </TriggerButton>
              </div>
            )}
            {scrollPercent >= subsections.viral.start && scrollPercent < subsections.viral.end && (
              <div className="flex gap-4">
                <TriggerButton
                  targetPercent={subsections.intro.end - 0.01}
                  backwards
                ></TriggerButton>
                <TriggerButton targetPercent={subsections.teamwork.start + 0.01}>
                  How can I meet my team?
                </TriggerButton>
              </div>
            )}
            {scrollPercent >= subsections.teamwork.start && (
              <div className="flex gap-4">
                <TriggerButton
                  targetPercent={subsections.viral.start + 0.01}
                  backwards
                ></TriggerButton>
                <TriggerButton targetPercent={next} waves>
                  I have more questions!
                </TriggerButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
