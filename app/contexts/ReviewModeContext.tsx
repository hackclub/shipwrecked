'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ReviewModeContextType {
  isReviewMode: boolean;
  toggleReviewMode: () => void;
  enableReviewMode: () => void;
  disableReviewMode: () => void;
}

const ReviewModeContext = createContext<ReviewModeContextType | undefined>(undefined);

export function ReviewModeProvider({ children }: { children: ReactNode }) {
  const [isReviewMode, setIsReviewMode] = useState(false);

  const toggleReviewMode = () => {
    setIsReviewMode(prev => !prev);
  };

  const enableReviewMode = () => {
    setIsReviewMode(true);
  };

  const disableReviewMode = () => {
    setIsReviewMode(false);
  };

  return (
    <ReviewModeContext.Provider value={{ isReviewMode, toggleReviewMode, enableReviewMode, disableReviewMode }}>
      {children}
    </ReviewModeContext.Provider>
  );
}

export function useReviewMode() {
  const context = useContext(ReviewModeContext);
  if (context === undefined) {
    throw new Error('useReviewMode must be used within a ReviewModeProvider');
  }
  return context;
} 