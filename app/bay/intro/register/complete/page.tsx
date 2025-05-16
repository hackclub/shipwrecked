"use client";

import ProgressBar from "@/components/common/ProgressBar";
import Image from "next/image";
import { redirect } from "next/navigation";

// Registration Complete Page (/bay/intro/register/complete)
// Shows a confirmation page that the users registration has been recorded
export default function Page() {
  function next() {
    redirect("/");
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center w-[100vw] h-[100vh] bg-[url(/hut.webp)] py-12">
        <img src="/logo-border.svg" className="w-102 mb-4"></img>
        <div className="w-102">
          <ProgressBar
            value={100}
            variant="warning"
            className="border rounded border-gray-900/60"
          ></ProgressBar>
        </div>
        <div className="text-dark-brown bg-sand/60 border border-sand p-6 rounded-md w-full max-w-4xl backdrop-blur-md mb-2">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Registration Complete!
          </h1>
          Your registration has been submitted!
          <div className="flex justify-end mt-2">
            <button
              className="py-2 md:px-4 px-2 uppercase disabled:bg-dark-blue/20 bg-dark-blue/60 text-sand border border-sand whitespace-nowrap text-xs md:text-base transition hover:not-disabled:border-yellow backdrop-blur-sm rounded-full cursor-pointer"
              onClick={next}
            >
              <span className="flex items-center gap-1 flex-nowrap">
                Landing Page
                <Image
                  src="/back-arrow.png"
                  width={24}
                  height={24}
                  alt="next"
                  className="w-8 h-8 -scale-x-100"
                />
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
