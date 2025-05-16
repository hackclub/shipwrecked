import Link from "next/link";
import Tabs from "./Tabs";
import Image from "next/image";

export default function Sidebar({
  setSidebarOpen,
}: {
  setSidebarOpen?: (open: boolean) => void;
}) {
  return (
    <aside className="w-64 bg-slate-100 p-6 shadow-md min-h-screen">
      <div className="mb-8">
        <div className="flex gap-2 flex-nowrap items-center justify-center">
          <a href="/info">
            <Image
              src="/logo.svg"
              width={0}
              height={0}
              alt="Shipwrecked Logo"
              className="md:w-110 w-80 h-auto"
            />
          </a>
        </div>
        <p
          className="text-xl text-sky-600 mt-1"
          style={{ fontFamily: "var(--font-baloo)" }}
        >
          August 8-11
        </p>
        <div className="flex justify-center mt-4 mb-8">
          <Link
            href="/"
            className={`text-base flex justify-between items-center flex-nowrap rounded py-2 px-4 text-center transition w-full max-w-xs
              bg-slate-200/50 hover:bg-blue-300/50 shadow group font-semibold text-dark-blue`}
            style={{ fontFamily: "var(--font-baloo)" }}
          >
            <svg
              className="w-5 h-5 text-sky-600 group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Main website
          </Link>
        </div>
      </div>
      <Tabs setSidebarOpen={setSidebarOpen} />
    </aside>
  );
}
