"use client"
import { SessionProvider } from "next-auth/react";
import { useSession } from "next-auth/react";
import Header from "@/components/common/Header";
import Link from "next/link";

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
  
  // Check if user is authenticated and has admin access
  const isAuthenticated = status === "authenticated";
  const isAdmin = session?.user?.role === "Admin" || session?.user?.isAdmin === true;
  
  // Only show admin content when authenticated AND user is admin
  if (isAuthenticated && isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header 
          session={session}
          status={status}
        />
        <main className="flex-grow container mx-auto p-6">
          {children}
        </main>
      </div>
    );
  }
  
  // If authenticated but not admin, show access denied
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header 
          session={session}
          status={status}
        />
        <main className="flex-grow container mx-auto p-6">
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-md">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
              <p className="text-gray-600 mb-6">
                You don't have sufficient permissions to access the admin area. 
                Only users with Administrator role can access this section.
              </p>
              <Link 
                href="/bay"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Return to My Projects
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // When not authenticated, let page handle the auth flow
  return children;
} 