"use client"

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from '@/components/common/Header';

export default function AccessDeniedPage() {
  const { data: session, status } = useSession();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        session={session}
        status={status}
      />
      
      <main className="flex-grow flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-red-600 p-4">
            <h1 className="text-2xl font-bold text-white text-center">Access Denied</h1>
          </div>
          
          <div className="p-6">
            <div className="flex justify-center mb-6">
              <svg className="h-16 w-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <p className="text-gray-700 mb-4 text-center">
              You no longer have administrator access to this area.
            </p>
            
            <p className="text-gray-600 mb-6 text-center text-sm">
              Your admin privileges have been removed or revoked. 
              If you believe this is an error, please contact a system administrator.
            </p>
            
            <div className="flex flex-col space-y-3">
              <Link 
                href="/bay"
                className="w-full py-2 bg-blue-600 text-white text-center rounded hover:bg-blue-700 transition-colors"
              >
                Return to My Projects
              </Link>
              
              {status === "authenticated" && (
                <Link 
                  href="/superadmin"
                  className="w-full py-2 bg-gray-200 text-gray-800 text-center rounded hover:bg-gray-300 transition-colors"
                >
                  Request Admin Access
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 