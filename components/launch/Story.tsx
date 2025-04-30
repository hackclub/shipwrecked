"use client";
import { motion, useMotionValue, animate, AnimationPlaybackControls } from "motion/react";
import { createContext, useEffect, useState, useRef } from "react";
import Shore from "./Shore";
import Info from "./Info";
import Waves from "./Waves";
import Bay from "./Bay";
import CallToAction from "./CallToAction";
import TriggerButton from "./TriggerButton";
import ShareButton from "@/components/common/ShareButton";
import { PrefillData } from "@/types/prefill";

export const ScrollProgressContext = createContext<
  [number, (n: number, duration?: number) => void]
>([0, () => { }]);

export default function Story({ prefillData }: { prefillData: PrefillData }) {
  const [scrollPercent, setScrollPercent] = useState(0);
  const motionValue = useMotionValue(scrollPercent);
  // Fix type for animation ref
  const currentAnimationRef = useRef<AnimationPlaybackControls | null>(null);

  const sections = {
    shore: { start: 0, end: 0.25 },
    // waves from 0.2 to 0.3
    info: { start: 0.25, end: 0.5 },
    // waves from 0.45 to 0.55
    bay: { start: 0.5, end: 0.75 },
    // waves from 0.7 to 0.8
    cta: { start: 0.75, end: 1 },
  };

  const WAVE_BOUNDS: [number, number][] = [
    [0.2, 0.3],
    [0.45, 0.55],
    [0.7, 0.8],
  ];

  const WAVE_OFFSET = 0.075;

  useEffect(() => {
    // Sync motion value to scrollPercent
    const unsubscribe = motionValue.on("change", (latest: number) => {
      setScrollPercent(latest);
      // set scrolltop to match scrollpercent
      const scrollTop =
        latest *
        (document.documentElement.scrollHeight -
          document.documentElement.clientHeight);
      window.scrollTo({
        top: scrollTop,
      });
    });

    return () => unsubscribe();
  }, [motionValue]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      setScrollPercent(scrollTop / (scrollHeight - clientHeight));
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToPercent = (percent: number, duration?: number) => {
    // Cancel any existing animation
    if (currentAnimationRef.current) {
      currentAnimationRef.current.stop();
    }

    // Start new animation and store the control
    currentAnimationRef.current = animate(motionValue, percent, {
      type: "spring",
      duration: duration || 5,
      ease: "easeIn", // 'cubic-bezier(0.83, 0, 0.17, 1)'
      bounce: 0,
    });

    // correct for scrollTop
    const scrollTop =
      percent *
      (document.documentElement.scrollHeight -
        document.documentElement.clientHeight);
    window.scrollTo({
      top: scrollTop,
      behavior: "smooth",
    });
  };

  const animateSectionIfWithinBounds = (start: number, end: number) =>
    scrollPercent >= start && scrollPercent < end;

  const activeWaveBounds = WAVE_BOUNDS.find(
    ([start, end]) => scrollPercent >= start && scrollPercent <= end
  ) || [undefined, undefined];

  return (
    <ScrollProgressContext.Provider value={[scrollPercent, scrollToPercent]}>
      <motion.div
        className="fixed w-full h-full"
        style={{
          bottom: 0,
          left: 0,
        }}
      >
        {scrollPercent < sections.cta.start && (
          <div className="absolute top-8 right-8 z-50">
            <TriggerButton targetPercent={1} waves>Sign up</TriggerButton>
          </div>
        )}
        {scrollPercent >= sections.cta.start && <ShareButton />}
        <div>
          {animateSectionIfWithinBounds(
            sections.shore.start,
            sections.shore.end
          ) && <Shore next={sections.info.start + WAVE_OFFSET} />}

          {animateSectionIfWithinBounds(
            sections.info.start,
            sections.info.end
          ) && (
              <Info
                previous={sections.shore.end - WAVE_OFFSET}
                next={sections.bay.start + WAVE_OFFSET}
                start={sections.info.start}
                end={sections.info.end}
              />
            )}

          {animateSectionIfWithinBounds(
            sections.bay.start,
            sections.bay.end
          ) && (
              <Bay
                previous={sections.bay.end - WAVE_OFFSET}
                next={sections.cta.start + WAVE_OFFSET}
                start={sections.bay.start}
                end={sections.bay.end}
              />
            )}

          {(animateSectionIfWithinBounds(
            sections.cta.start,
            sections.cta.end
          ) ||
            scrollPercent === 1) && (
              <CallToAction 
                previous={sections.bay.end - WAVE_OFFSET} 
                prefillData={prefillData}
              />
            )}

          <Waves start={activeWaveBounds[0]} end={activeWaveBounds[1]} />
        </div>
      </motion.div>
    </ScrollProgressContext.Provider>
  );
}
