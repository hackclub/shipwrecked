'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import Header from "@/components/common/Header";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function MapLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionWrapper>
        {children}
      </SessionWrapper>
    </SessionProvider>
  );
}

function SessionWrapper({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  // Check if user is authenticated
  const isAuthenticated = status === "authenticated";
  // Check for the attending tag will be handled by API
  // Only show review content when authenticated
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        {<Header
          session={session}
          status={status}
        />}
        <main className="flex-grow">
          {children}
        </main>
      </div>
    );
  }

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
              Only authenticated and attending users can access the flight map.
            </p>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Return to Shipwrecked
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}