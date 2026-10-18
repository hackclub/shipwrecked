'use client';
import { useState } from 'react';
import ContentWrapper from '@/components/docs/ContentWrapper';
import Sidebar from '@/components/docs/Sidebar';

export default function MDInfoLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 z-40 transition-opacity md:hidden ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      {/* Sidebar */}
      <div
        className={`
          md:sticky fixed z-50 inset-y-0 left-0 w-64 bg-white shadow-lg transform transition-transform duration-200
          h-screen md:static md:translate-x-0 md:shadow-none min-h-screen
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar setSidebarOpen={setSidebarOpen} />
      </div>
      {/* Hamburger button */}
      {!sidebarOpen && (
        <button
          className="absolute top-4 left-4 z-50 p-2 rounded md:hidden bg-white shadow"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Open sidebar"
          type="button"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Main content */}
      <main className="flex-1 p-8 bg-white md:ml-0">
        <div className="max-w-3xl mx-0">
          <ContentWrapper>{children}</ContentWrapper>
        </div>
      </main>
    </div>
  );
}
