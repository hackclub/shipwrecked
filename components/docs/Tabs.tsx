'use client';
import info from '@/info.json';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Tabs({ setSidebarOpen }: { setSidebarOpen?: (open: boolean) => void }) {
  const pathname = usePathname();
  const currentId = pathname.split('/').pop();

  return (
    <nav>
      <ul className="space-y-3">
        <div className="text-sm font-bold text-slate-400 uppercase">Information</div>
        {info.map((item) => (
          <li key={item.name} onClick={() => setSidebarOpen && setSidebarOpen(false)}>
            <Link
              href={`/info/${item.slug}`}
              className={`text-base flex justify-between items-center flex-nowrap rounded py-2 px-4 text-center transition ${
                currentId === item.slug
                  ? 'bg-blue-900 text-white font-bold' // Darker active background
                  : 'bg-slate-200/50 hover:bg-blue-300/50' // Slightly darker default and hover backgrounds
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span>{item.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
