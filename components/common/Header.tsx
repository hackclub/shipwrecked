import { useState, useRef, useEffect } from "react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { createAvatar } from '@dicebear/core';
import { lorelei } from '@dicebear/collection';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type HeaderProps = {
    session: Session | null;
    status: "authenticated" | "unauthenticated" | "loading";
};

export default function Header({ session, status }: HeaderProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setMobileMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const isActive = (path: string) => {
        return pathname === path;
    };

    return (
        <nav className="w-full px-6 py-4 bg-[#47D1F6] flex items-center justify-between shadow-md">
            <div className="flex items-center relative" ref={mobileMenuRef}>
                {/* Mobile menu button */}
                <button 
                    className="md:hidden text-white mr-4 focus:outline-none"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                    </svg>
                </button>
                
                {/* Desktop menu */}
                <div className="hidden md:flex space-x-6 text-white">
                    <Link 
                        href="/bay" 
                        className={`transition-colors ${isActive('/bay') ? 'font-semibold underline underline-offset-4' : 'hover:text-cyan-100'}`}
                    >
                        Status
                    </Link>
                    <Link 
                        href="/bay/faq" 
                        className={`transition-colors ${isActive('/bay/faq') ? 'font-semibold underline underline-offset-4' : 'hover:text-cyan-100'}`}
                    >
                        FAQ
                    </Link>
                    <Link 
                        href="/bay/settings" 
                        className={`transition-colors ${isActive('/bay/settings') ? 'font-semibold underline underline-offset-4' : 'hover:text-cyan-100'}`}
                    >
                        Settings
                    </Link>
                </div>
                
                {/* Mobile menu dropdown */}
                {mobileMenuOpen && (
                    <div className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-lg p-4 w-48 z-20 md:hidden">
                        <div className="space-y-4">
                            <Link 
                                href="/bay" 
                                className={`block transition-colors ${isActive('/bay') ? 'font-semibold text-[#47D1F6]' : 'text-gray-700 hover:text-[#47D1F6]'}`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Status
                            </Link>
                            <Link 
                                href="/bay/faq" 
                                className={`block transition-colors ${isActive('/bay/faq') ? 'font-semibold text-[#47D1F6]' : 'text-gray-700 hover:text-[#47D1F6]'}`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                FAQ
                            </Link>
                            <Link 
                                href="/bay/settings" 
                                className={`block transition-colors ${isActive('/bay/settings') ? 'font-semibold text-[#47D1F6]' : 'text-gray-700 hover:text-[#47D1F6]'}`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Settings
                            </Link>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-4 relative" ref={dropdownRef}>
                {status === "authenticated" && (
                    <>
                        <img
                            src={session?.user.image ? session.user.image : createAvatar(lorelei, { seed: session?.user.email ?? "" }).toDataUri()}
                            alt={session?.user.email!}
                            className="w-10 h-10 rounded-full border-2 border-white shadow"
                        />
 
                        <span className="text-white font-semibold hidden sm:inline">{session?.user.name ? session?.user?.name : session?.user.email?.slice(0, 13) + "..."}</span>
                        <button
                            onClick={() => setDropdownOpen((prev) => !prev)}
                            className="bg-white text-[#47D1F6] font-bold px-4 py-2 rounded-lg shadow hover:bg-[#f9e9c7] hover:text-[#3B2715] transition"
                        >
                            Log out
                        </button>
                        {dropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg p-4 w-40 z-10">
                                <div className="text-center space-y-4">
                                <p className="text-sm text-center">Are you sure you want to log out?</p>
                                    <button
                                        type="submit"
                                        className="bg-white text-[#47D1F6] font-bold px-4 py-2 rounded-lg shadow hover:bg-[#f9e9c7] hover:text-[#3B2715] transition"
                                        onClick={() => signOut()}
                                    >
                                        Log me out!
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
                {status !== "authenticated" && (
                    <a
                        href="/api/auth/signin"
                        className="bg-white text-[#47D1F6] font-bold px-4 py-2 rounded-lg shadow hover:bg-[#f9e9c7] hover:text-[#3B2715] transition"
                    >
                        Sign in
                    </a>
                )}
            </div>
        </nav>
    );
}