'use client';
import { useState, useRef, useEffect } from "react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { createAvatar } from '@dicebear/core';
import { thumbs } from '@dicebear/collection';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type HeaderProps = {
    session: Session | null;
    status: "authenticated" | "unauthenticated" | "loading";
};

interface TravelStipend {
    totalHours: number;
    totalAmount: number;
}

interface ShopOrder {
    id: string;
    itemName: string;
    quantity: number;
    status: string;
}

export default function Header({ session, status }: HeaderProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [adminMenuOpen, setAdminMenuOpen] = useState(false);
    const [isShopOrdersAdmin, setIsShopOrdersAdmin] = useState(false);
    const [travelStipends, setTravelStipends] = useState<TravelStipend | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const adminMenuRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    
    // Fetch isShopOrdersAdmin and travel stipends on mount
    useEffect(() => {
        if (status === 'authenticated') {
            // Fetch user data
            fetch('/api/users/me').then(async (res) => {
                if (res.ok) {
                    const data = await res.json();
                    setIsShopOrdersAdmin(!!data.isShopOrdersAdmin);
                }
            });

            // Fetch travel stipends
            fetch('/api/users/me/shop-orders').then(async (res) => {
                if (res.ok) {
                    const ordersData = await res.json();
                    
                    // Calculate travel stipend total from fulfilled orders
                    let totalHours = 0;
                    ordersData.orders.forEach((order: ShopOrder) => {
                        if (order.status === 'fulfilled' && order.itemName.toLowerCase().includes('travel stipend')) {
                            totalHours += order.quantity; // Each quantity represents 1 hour
                        }
                    });
                    
                    setTravelStipends({
                        totalHours,
                        totalAmount: totalHours * 10 // $10 per hour
                    });
                }
            });
        }
    }, [status]);

    // More robust role checking - explicitly check for roles, don't show admin/review for regular users 
    const userRole = session?.user?.role || 'User';
    const isUserAdmin = userRole === 'Admin' || (session?.user?.isAdmin === true && userRole !== 'User');
    const isUserReviewer = userRole === 'Admin' || userRole === 'Reviewer';

    // Eligibility for shop
    const userStatus = session && session.user && typeof session.user.status === 'string' ? session.user.status : 'Unknown';
    const canAccessShop = isUserAdmin || (userStatus !== 'FraudSuspect' && userStatus !== 'Unknown');

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setMobileMenuOpen(false);
            }
            if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
                setAdminMenuOpen(false);
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

    const isAdminActive = () => {
        return pathname === '/admin' || pathname.startsWith('/admin/');
    };

    return (
        <nav className="w-full px-4 sm:px-6 py-4 bg-[#47D1F6] flex items-center justify-between shadow-md">
            <div className="flex items-center relative min-w-0" ref={mobileMenuRef}>
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
                <div className="hidden md:flex space-x-3 lg:space-x-4 xl:space-x-6 text-white">
                    <Link 
                        href="/bay" 
                        className={`transition-colors ${isActive('/bay') ? 'font-semibold underline underline-offset-4' : 'hover:text-cyan-100'}`}
                    >
                        My Projects
                    </Link>
                    <Link 
                        href="/bay/badge" 
                        className={`transition-colors ${isActive('/bay/badge') ? 'font-semibold underline underline-offset-4' : 'hover:text-cyan-100'}`}
                    >
                        Badge
                    </Link>
                    <Link 
                        href="/gallery" 
                        className={`transition-colors ${isActive('/gallery') ? 'font-semibold underline underline-offset-4' : 'hover:text-cyan-100'}`}
                    >
                        Gallery
                    </Link>
                    <Link 
                        href="/leaderboard" 
                        className={`transition-colors ${isActive('/leaderboard') ? 'font-semibold underline underline-offset-4' : 'hover:text-cyan-100'}`}
                    >
                        Leaderboard
                    </Link>
                    <Link 
                        href="/faq" 
                        className={`transition-colors ${isActive('/faq') ? 'font-semibold underline underline-offset-4' : 'hover:text-cyan-100'}`}
                    >
                        FAQ
                    </Link>
                    <Link 
                        href="/settings" 
                        className={`transition-colors ${isActive('/settings') ? 'font-semibold underline underline-offset-4' : 'hover:text-cyan-100'}`}
                    >
                        Settings
                    </Link>
                    {/* Show Review tab for reviewers and admins */}
                    {isUserReviewer && (
                        <Link 
                            href="/review" 
                            className={`transition-colors ${isActive('/review') ? 'font-semibold underline underline-offset-4' : 'hover:text-cyan-100'}`}
                        >
                            Review
                        </Link>
                    )}
                    {/* Eligible users can access Shop */}
                    {canAccessShop && (
                        <Link 
                            href="/bay/shop" 
                            className={`transition-colors ${isActive('/bay/shop') ? 'font-semibold underline underline-offset-4' : 'hover:text-cyan-100'}`}
                        >
                            Shop
                        </Link>
                    )}
                    {/* Admin section with dropdown for admin users */}
                    {isUserAdmin && (
                        <div className="relative" ref={adminMenuRef}>
                            <button
                                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                                className={`flex items-center transition-colors ${isAdminActive() ? 'font-semibold underline underline-offset-4' : 'hover:text-cyan-100'}`}
                            >
                                Admin
                                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={adminMenuOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                </svg>
                            </button>
                            
                            {adminMenuOpen && (
                                <div className="absolute left-0 mt-2 bg-white rounded-lg shadow-lg p-2 z-20 w-40">
                                    <Link 
                                        href="/admin" 
                                        className={`block px-3 py-2 rounded transition-colors ${
                                            isActive('/admin') 
                                                ? 'font-semibold text-[#47D1F6] bg-blue-50 border-l-4 border-[#47D1F6]' 
                                                : 'text-gray-700 hover:bg-gray-100 hover:text-[#47D1F6] border-l-4 border-transparent'
                                        }`}
                                        onClick={() => setAdminMenuOpen(false)}
                                    >
                                        Dashboard
                                    </Link>
                                    <Link 
                                        href="/admin/users" 
                                        className={`block px-3 py-2 rounded transition-colors ${
                                            isActive('/admin/users') || pathname.startsWith('/admin/users/') 
                                                ? 'font-semibold text-[#47D1F6] bg-blue-50 border-l-4 border-[#47D1F6]' 
                                                : 'text-gray-700 hover:bg-gray-100 hover:text-[#47D1F6] border-l-4 border-transparent'
                                        }`}
                                        onClick={() => setAdminMenuOpen(false)}
                                    >
                                        Users
                                    </Link>
                                    <Link 
                                        href="/admin/projects" 
                                        className={`block px-3 py-2 rounded transition-colors ${
                                            isActive('/admin/projects') || pathname.startsWith('/admin/projects/') 
                                                ? 'font-semibold text-[#47D1F6] bg-blue-50 border-l-4 border-[#47D1F6]' 
                                                : 'text-gray-700 hover:bg-gray-100 hover:text-[#47D1F6] border-l-4 border-transparent'
                                        }`}
                                        onClick={() => setAdminMenuOpen(false)}
                                    >
                                        Projects
                                    </Link>
                                    <Link 
                                        href="/admin/audit-logs" 
                                        className={`block px-3 py-2 rounded transition-colors ${
                                            isActive('/admin/audit-logs') || pathname.startsWith('/admin/audit-logs/') 
                                                ? 'font-semibold text-[#47D1F6] bg-blue-50 border-l-4 border-[#47D1F6]' 
                                                : 'text-gray-700 hover:bg-gray-100 hover:text-[#47D1F6] border-l-4 border-transparent'
                                        }`}
                                        onClick={() => setAdminMenuOpen(false)}
                                    >
                                        Audit Logs
                                    </Link>
                                     <Link 
                                        href="/admin/dashboards/referrals" 
                                        className={`block px-3 py-2 rounded transition-colors ${
                                            isActive('/admin/dashboards/referrals') || pathname.startsWith('/admin/dashboards/referrals') 
                                                ? 'font-semibold text-[#47D1F6] bg-blue-50 border-l-4 border-[#47D1F6]' 
                                                : 'text-gray-700 hover:bg-gray-100 hover:text-[#47D1F6] border-l-4 border-transparent'
                                        }`}
                                        onClick={() => setAdminMenuOpen(false)}
                                    >
                                        Referrals
                                    </Link>
                                    {isShopOrdersAdmin && (
                                        <Link 
                                            href="/admin/shop-orders" 
                                            className={`block px-3 py-2 rounded transition-colors ${
                                                isActive('/admin/shop-orders') || pathname.startsWith('/admin/shop-orders') 
                                                    ? 'font-semibold text-[#47D1F6] bg-blue-50 border-l-4 border-[#47D1F6]' 
                                                    : 'text-gray-700 hover:bg-gray-100 hover:text-[#47D1F6] border-l-4 border-transparent'
                                            }`}
                                            onClick={() => setAdminMenuOpen(false)}
                                        >
                                            Shop Orders
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
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
                                My Projects
                            </Link>
                            <Link 
                                href="/bay/badge" 
                                className={`block transition-colors ${isActive('/bay/badge') ? 'font-semibold text-[#47D1F6]' : 'text-gray-700 hover:text-[#47D1F6]'}`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Badge
                            </Link>
                            <Link 
                                href="/gallery" 
                                className={`block transition-colors ${isActive('/gallery') ? 'font-semibold text-[#47D1F6]' : 'text-gray-700 hover:text-[#47D1F6]'}`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Gallery
                            </Link>
                            <Link 
                                href="/leaderboard" 
                                className={`block transition-colors ${isActive('/leaderboard') ? 'font-semibold text-[#47D1F6]' : 'text-gray-700 hover:text-[#47D1F6]'}`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Leaderboard
                            </Link>
                            <Link 
                                href="/faq" 
                                className={`block transition-colors ${isActive('/faq') ? 'font-semibold text-[#47D1F6]' : 'text-gray-700 hover:text-[#47D1F6]'}`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                FAQ
                            </Link>
                            <Link 
                                href="/settings" 
                                className={`block transition-colors ${isActive('/settings') ? 'font-semibold text-[#47D1F6]' : 'text-gray-700 hover:text-[#47D1F6]'}`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Settings
                            </Link>
                            {/* Eligible users can access Shop in mobile menu */}
                            {canAccessShop && (
                                <Link 
                                    href="/bay/shop" 
                                    className={`block transition-colors ${isActive('/bay/shop') ? 'font-semibold text-[#47D1F6]' : 'text-gray-700 hover:text-[#47D1F6]'}`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Shop
                                </Link>
                            )}
                            {/* Admin section with submenu for mobile */}
                            {isUserAdmin && (
                                <div className="space-y-2">
                                    <div className="font-semibold text-gray-900">Admin</div>
                                    <Link 
                                        href="/admin" 
                                        className={`block pl-4 transition-colors ${isActive('/admin') ? 'font-semibold text-[#47D1F6]' : 'text-gray-700 hover:text-[#47D1F6]'}`}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Dashboard
                                    </Link>
                                    <Link 
                                        href="/admin/users" 
                                        className={`block pl-4 transition-colors ${isActive('/admin/users') ? 'font-semibold text-[#47D1F6]' : 'text-gray-700 hover:text-[#47D1F6]'}`}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Users
                                    </Link>
                                    <Link 
                                        href="/admin/projects" 
                                        className={`block pl-4 transition-colors ${isActive('/admin/projects') ? 'font-semibold text-[#47D1F6]' : 'text-gray-700 hover:text-[#47D1F6]'}`}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Projects
                                    </Link>
                                    <Link 
                                        href="/admin/audit-logs" 
                                        className={`block pl-4 transition-colors ${isActive('/admin/audit-logs') ? 'font-semibold text-[#47D1F6]' : 'text-gray-700 hover:text-[#47D1F6]'}`}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Audit Logs
                                    </Link>
                                    {isShopOrdersAdmin && (
                                        <Link 
                                            href="/admin/shop-orders" 
                                            className={`block pl-4 transition-colors ${isActive('/admin/shop-orders') ? 'font-semibold text-[#47D1F6]' : 'text-gray-700 hover:text-[#47D1F6]'}`}
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            Shop Orders
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 relative flex-shrink-0" ref={dropdownRef}>
                {status === "authenticated" && (
                    <>
                        <img
                            src={session?.user.image ? session.user.image : createAvatar(thumbs, { seed: session?.user.id || 'default' }).toDataUri()}
                            alt={session?.user.email || 'User avatar'}
                            className="w-10 h-10 rounded-full border-2 border-white shadow"
                        />

                        <span className="text-white font-semibold hidden lg:inline text-sm xl:text-base">{session?.user.name ? session?.user?.name : session?.user.email?.slice(0, 13) + "..."}</span>
                        
                        {/* Travel Stipend Piggy Bank */}
                        {travelStipends && travelStipends.totalAmount > 0 && (
                            <div 
                                className="flex items-center bg-white bg-opacity-90 text-[#47D1F6] font-bold px-2 sm:px-3 py-2 rounded-lg shadow hover:bg-opacity-100 transition-all cursor-pointer"
                                title={`Travel Stipend: $${travelStipends.totalAmount}`}
                            >
                                <img src="/piggy.png" alt="Travel Stipend" className="w-5 h-5 mr-1" />
                                <span className="text-sm font-bold">${travelStipends.totalAmount}</span>
                            </div>
                        )}
                        <button
                            onClick={() => setDropdownOpen((prev) => !prev)}
                            className="bg-white text-[#47D1F6] font-bold px-3 sm:px-4 py-2 rounded-lg shadow hover:bg-[#f9e9c7] hover:text-[#3B2715] transition text-sm whitespace-nowrap"
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
                    <Link
                        href="/api/auth/signin"
                        className="bg-white text-[#47D1F6] font-bold px-4 py-2 rounded-lg shadow hover:bg-[#f9e9c7] hover:text-[#3B2715] transition"
                    >
                        Sign In
                    </Link>
                )}
            </div>
        </nav>
    );
}