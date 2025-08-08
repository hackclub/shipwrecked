'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

interface ExperienceToggleProps {
  className?: string;
}

export default function ExperienceToggle({ className = '' }: ExperienceToggleProps) {
  const [isIslandMode, setIsIslandMode] = useState(true); // Default to Island Experience
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  // Load the setting from cookies on mount, with smart defaults based on attendee status
  useEffect(() => {
    const clearExperience = searchParams.get('clearExperience');
    
    // Clear cookie if coming from login redirect
    if (clearExperience === 'true') {
      // Clear the cookie
      document.cookie = 'experience-mode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
      
      // Remove the clearExperience parameter from URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete('clearExperience');
      window.history.replaceState({}, '', url.toString());
    }
    
    const savedMode = document.cookie
      .split('; ')
      .find(row => row.startsWith('experience-mode='))
      ?.split('=')[1];
    
    if (savedMode) {
      // Use saved preference if it exists
      setIsIslandMode(savedMode === 'island');
    } else if (session?.user) {
      // Set default based on attendee status if no saved preference
      if (session.user.isAttendee) {
        // Attendees default to Island Experience
        setIsIslandMode(true);
        // Set cookie to remember this default
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        document.cookie = `experience-mode=island; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      } else {
        // Non-attendees default to Voyage Experience
        setIsIslandMode(false);
        // Set cookie to remember this default
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        document.cookie = `experience-mode=voyage; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      }
    } else {
      // Fallback: Default to Island for loading state
      setIsIslandMode(true);
    }
    
    setIsLoading(false);
  }, [searchParams, session]);

  // Save to cookies when toggled
  const toggleExperience = () => {
    const newMode = !isIslandMode;
    setIsIslandMode(newMode);
    
    // Set cookie with 1 year expiration
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `experience-mode=${newMode ? 'island' : 'voyage'}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('experiencechange', { 
      detail: newMode ? 'island' : 'voyage' 
    }));
  };

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  return (
    <button
      onClick={toggleExperience}
      className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isIslandMode 
          ? 'bg-white bg-opacity-90 text-[#47D1F6] hover:bg-opacity-100' 
          : 'bg-[#2D4A5C] text-white hover:bg-[#1F3B4C]'
      } shadow hover:shadow-md ${className}`}
title={`${isIslandMode ? 'Switch to voyage tracking experience' : 'Switch to peaceful island experience'}`}
    >
      <svg 
        className="w-4 h-4 mr-2" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        {isIslandMode ? (
          // Island icon (palm tree/island)
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 3v18m0-18c-2.5 0-4.5 2-4.5 4.5S9.5 12 12 12s4.5-2 4.5-4.5S14.5 3 12 3zM3 12h18M12 12c0 2.5-2 4.5-4.5 4.5S3 14.5 3 12s2-4.5 4.5-4.5S12 9.5 12 12z" 
          />
        ) : (
          // Ship/voyage icon
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 15l2-2m0 0l2 2m-2-2v8m0-8a9 9 0 1118 0m-9-3v3m0 0l3-3m-3 3l-3-3" 
          />
        )}
      </svg>
{isIslandMode ? 'goto voyage' : 'goto island'}
    </button>
  );
}