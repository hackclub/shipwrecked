'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export type ExperienceMode = 'island' | 'voyage';

/**
 * Hook to get and subscribe to experience mode changes
 * Returns the current experience mode ('island' or 'voyage')
 */
export function useExperienceMode(): {
  mode: ExperienceMode;
  isIslandMode: boolean;
  isVoyageMode: boolean;
  isLoading: boolean;
} {
  const [mode, setMode] = useState<ExperienceMode>('island'); // Default to island
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  useEffect(() => {
    const clearExperience = searchParams.get('clearExperience');
    
    // Clear cookie if coming from login redirect
    if (clearExperience === 'true') {
      // Clear the cookie
      document.cookie = 'experience-mode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
    }
    
    // Function to read the cookie
    const readMode = (): ExperienceMode => {
      if (typeof document === 'undefined') return 'island';
      
      const savedMode = document.cookie
        .split('; ')
        .find(row => row.startsWith('experience-mode='))
        ?.split('=')[1];
      
      return savedMode === 'voyage' ? 'voyage' : 'island';
    };

    const savedMode = readMode();
    
    // If no saved mode and we have session data, set default based on attendee status
    if (!document.cookie.includes('experience-mode=') && session?.user) {
      const defaultMode: ExperienceMode = session.user.isAttendee ? 'island' : 'voyage';
      setMode(defaultMode);
      
      // Save the default to cookie
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      document.cookie = `experience-mode=${defaultMode}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    } else {
      // Use saved mode
      setMode(savedMode);
    }
    
    setIsLoading(false);

    // Listen for storage events (when cookie changes in other tabs)
    const handleStorageChange = () => {
      setMode(readMode());
    };

    // Also listen for a custom event we can dispatch when the cookie changes
    const handleExperienceChange = (event: CustomEvent<ExperienceMode>) => {
      setMode(event.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('experiencechange', handleExperienceChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('experiencechange', handleExperienceChange as EventListener);
    };
  }, [searchParams, session]);

  return {
    mode,
    isIslandMode: mode === 'island',
    isVoyageMode: mode === 'voyage',
    isLoading,
  };
}

/**
 * Utility function to get the current experience mode synchronously (server-safe)
 * This can be used in server components or when you need immediate access
 */
export function getExperienceMode(): ExperienceMode {
  if (typeof document === 'undefined') return 'island';
  
  const savedMode = document.cookie
    .split('; ')
    .find(row => row.startsWith('experience-mode='))
    ?.split('=')[1];
  
  return savedMode === 'voyage' ? 'voyage' : 'island';
}

/**
 * Utility function to dispatch a custom event when experience mode changes
 * This helps components that use useExperienceMode to stay in sync
 */
export function dispatchExperienceChange(mode: ExperienceMode) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('experiencechange', { detail: mode }));
  }
}