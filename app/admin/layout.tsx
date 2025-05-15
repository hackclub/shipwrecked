"use client"
import { SessionProvider } from "next-auth/react";
import Header from "@/components/common/Header";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionWrapper>
        {children}
      </SessionWrapper>
    </SessionProvider>
  );
}

function SessionWrapper({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Only show admin UI when authenticated
  if (status === "authenticated") {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="bg-gray-900 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Shipwrecked Admin</h1>
              
              {/* Mobile menu button */}
              <button 
                className="ml-4 lg:hidden focus:outline-none" 
                onClick={toggleMenu}
                aria-label="Toggle navigation menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
              
              {/* Desktop navigation */}
              <nav className="ml-6 hidden lg:block">
                <ul className="flex space-x-4">
                  <li><Link href="/admin" className="hover:text-blue-300">Dashboard</Link></li>
                  <li><Link href="/admin/users" className="hover:text-blue-300">Users</Link></li>
                  <li><Link href="/admin/projects" className="hover:text-blue-300">Projects</Link></li>
                </ul>
              </nav>
            </div>
            <div className="flex items-center">
              {session?.user?.name && (
                <span className="text-sm">{session.user.name}</span>
              )}
            </div>
          </div>
          
          {/* Mobile navigation dropdown */}
          {isMenuOpen && (
            <div className="container mx-auto mt-3 lg:hidden">
              <nav className="bg-gray-800 rounded-md p-3">
                <ul className="space-y-2">
                  <li>
                    <Link 
                      href="/admin" 
                      className="block px-3 py-2 rounded hover:bg-gray-700"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/admin/users" 
                      className="block px-3 py-2 rounded hover:bg-gray-700"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Users
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/admin/projects" 
                      className="block px-3 py-2 rounded hover:bg-gray-700"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Projects
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </header>
        <main className="flex-grow container mx-auto p-6">
          {children}
        </main>
      </div>
    );
  }
  
  // When not authenticated, just show children (which will be the access denied page)
  return children;
} 