'use client';
import { useContext } from "react";
import { ScrollProgressContext } from "./Story";
import Image from "next/image";
import { motion } from "motion/react";
import TriggerButton from "./TriggerButton";

export default function Shore({ next }: { next: number }) {
  const [scrollPercent, scrollToPercent] = useContext(ScrollProgressContext);

  return (
    <motion.div className="fixed z-10 w-screen" style={{
      // Clamp the bottom for scroll percent 5–15% and translate up
      bottom: `-${Math.min(Math.max(scrollPercent, 0) / 0.10 * 100, 100)}%`,
    }}>
      <div className="h-screen w-screen"
        style={{
          height: "200vh",
          backgroundImage: `url('/shore.webp')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="h-screen md:aspect-video">
          <div className="flex w-screen h-screen md:px-30 md:py-20 px-15 py-10 flex-col justify-start">
            <div className="px-0 py-0 rounded w-fit">
              <Image src="/logo-outline.svg" width={0} height={0} alt="Shipwrecked" className="md:w-100 w-70 p-5 h-auto translate-x-[-25px]" />
              <div className="flex items-center">
                <Image src="/calendar-icon.png" width={0} height={0} alt="Calendar Icon" className="h-[3em] w-auto py-auto"/>
                <h2 className="md:text-3xl text-2xl font-bold text-white uppercase p-3 pl-1 w-fit text-outline-dark-blue">August 8 - 11, 2025</h2>
              </div>
              <div className="flex items-center">
                <Image src="/location-icon.png" width={0} height={0} alt="Location Icon" className="h-[3em] w-auto py-auto"/>
                <h2 className="md:text-3xl text-2xl font-bold text-white uppercase p-3 pl-1 w-fit text-outline-dark-blue">Cathleen Stone Island, Boston Harbor</h2>
              </div>
              <div className="flex flex-col md:flex-row gap-4 justify-start md:items-center">
                <a href="/bay/login" className="w-fit py-3 md:px-6 md:pr-7 px-4 pr-6 uppercase italic bg-yellow text-dark-blue border border-sand whitespace-nowrap text-sm md:text-lg font-bold transition-all duration-300 hover:border-dark-blue hover:scale-105 backdrop-blur-sm rounded-full cursor-pointer active:scale-95 flex items-center gap-3 pulse-glow" style={{display: 'inline-block'}}>
                  Log into the Bay
                </a>
                <TriggerButton targetPercent={next} waves>What&apos;s Hack Club Shipwrecked?</TriggerButton>
              </div>
              <button className="absolute md:bottom-[calc(100vh+30px)] bottom-[calc(100vh+20px)] right-10 text-6xl" onClick={() => {
                scrollToPercent(0);
              }}>
                <Image src="/back-arrow.png" width={80} height={80} alt="arrow" className="w-20 h-20 rotate-270" />
              </button>
            </div>
          </div>
        </div>
        <div className="w-screen h-screen flex flex-col items-center justify-center px-5 m-0">
          <Image src="/sand-logo.png" alt="" width={0} height={0} className="w-auto lg:h-[30vh] md:h-[25vh] h-[20vh] md:translate-x-[-10px] opacity-30 pb-10"  />
          <button onClick={() => {
            scrollToPercent(0.10);
          }}>
            <span className="sr-only">Go to next section</span>
            <Image src="/bottle.png" alt="" style={{cursor: "pointer"}} width={690} height={403} className="h-auto lg:w-[50vw] w-[75vw]"  />
          </button>
          <div className="space-y-3 my-6">
            <div className="size-2 rounded-full bg-[#3B2715]"></div>
            <div className="size-2 rounded-full bg-[#3B2715]"></div>
            <div className="size-2 rounded-full bg-[#3B2715]"></div>
          </div>
          <h1 className="text-5xl font-bold mb-4 italic text-center text-[#3B2715]">Something washes up on the shore...</h1>
          <p className="text-2xl italic text-center text-[#3B2715]">(Click the bottle or scroll to continue)</p>
        </div>
      </div>
      <style jsx global>{`
      @keyframes pulse-glow {
        0% {
          box-shadow: 0 0 0 0 rgba(255, 214, 10, 0.7), 0 0 0 0 rgba(255, 214, 10, 0.5);
        }
        70% {
          box-shadow: 0 0 0 12px rgba(255, 214, 10, 0), 0 0 0 24px rgba(255, 214, 10, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(255, 214, 10, 0.7), 0 0 0 0 rgba(255, 214, 10, 0.5);
        }
      }
      .pulse-glow {
        animation: pulse-glow 1.5s infinite;
      }
      `}</style>
    </motion.div>
  )
}