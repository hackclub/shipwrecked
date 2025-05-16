"use client"
import { SessionProvider } from "next-auth/react";
import Header from "@/components/common/Header";
import { useSession } from "next-auth/react";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
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
  
  // Only show header when authenticated
  if (status === "authenticated") {
    return (
      <>
        <Header 
          session={session}
          status={status}
        />
        {children}
      </>
    );
  }
  
  // When not authenticated, just show children (which will handle its own auth flow)
  return children;
} 