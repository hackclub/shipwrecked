'use client';
import { useContext, type ReactNode } from "react";
import { ScrollProgressContext } from "./Story";
import Image from "next/image";

export default function TriggerButton({ children, targetPercent, backwards = false, waves = false }: { children?: ReactNode, targetPercent: number, backwards?: boolean, waves?: boolean }) {
  const [, scrollToPercent] = useContext(ScrollProgressContext);

  return (
    <button className={`${children ? 'py-2 md:px-4 md:pr-5 px-2 pr-4 w-fit' : 'p-2'} uppercase italic bg-dark-blue text-white border border-sand whitespace-nowrap text-xs md:text-base transition-all duration-300 hover:border-yellow hover:scale-105 hover:shadow-lg hover:shadow-dark-blue/20 backdrop-blur-sm rounded-full cursor-pointer active:scale-95`} onClick={() => {
      scrollToPercent(targetPercent, waves ? undefined : 0.1);
    }}>
      <span className="flex items-center gap-3 flex-nowrap">
        {children}
        <Image src="/back-arrow.png" width={24} height={24} alt="next" className={`w-8 h-8 transition-transform duration-300 ${backwards ? '' : '-scale-x-100'} group-hover:translate-x-1`} />
      </span> 
    </button>
  )
}