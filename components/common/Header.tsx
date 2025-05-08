import { useState, useRef, useEffect } from "react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";

export type HeaderProps = {
    session: Session | null;
    status: "authenticated" | "unauthenticated" | "loading";
};

export default function Header({ session, status }: HeaderProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <nav className="w-full px-6 py-4 bg-[#47D1F6] flex items-center justify-between shadow-md">
            <span className="text-lg font-bold text-white"></span>
            <div className="flex items-center gap-4 relative" ref={dropdownRef}>
                {status === "authenticated" && (
                    <>
                        {session?.user?.image && (
                            <img
                                src={session.user.image}
                                alt={session.user.name ?? "User"}
                                className="w-10 h-10 rounded-full border-2 border-white shadow"
                            />
                        )}
                        <span className="text-white font-semibold">{session?.user?.name}</span>
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