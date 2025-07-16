'use client';

import React from 'react';

interface ProgressBarProps {
  earnedProgress: number; // Progress earned from projects (0-100)
  purchasedProgress?: number; // Progress purchased from shop (0-100)
  totalProgress?: number; // Total progress including purchased (0-100)
  className?: string;
  showLabels?: boolean;
}

export default function ProgressBar({ 
  earnedProgress, 
  purchasedProgress = 0, 
  totalProgress,
  className = "",
  showLabels = true 
}: ProgressBarProps) {
  // Calculate total progress if not provided
  const calculatedTotal = totalProgress ?? Math.min(earnedProgress + purchasedProgress, 100);
  
  // Ensure values are within bounds
  const earned = Math.max(0, Math.min(100, earnedProgress));
  const purchased = Math.max(0, Math.min(100, purchasedProgress));
  const total = Math.max(0, Math.min(100, calculatedTotal));

  return (
    <div className={`w-full ${className}`}>
      {showLabels && (
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress to Island</span>
          <span>{total.toFixed(1)}%</span>
        </div>
      )}
      
      <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
        {/* Earned progress (blue) */}
        <div 
          className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${earned}%` }}
        />
        
        {/* Purchased progress (green) - only show if there's purchased progress */}
        {purchased > 0 && (
          <div 
            className="absolute top-0 h-full bg-green-500 transition-all duration-300 ease-out"
            style={{ 
              left: `${earned}%`,
              width: `${Math.min(purchased, 100 - earned)}%`
            }}
          />
        )}
        
        {/* Progress text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-white drop-shadow-sm">
            {earned.toFixed(1)}% earned
            {purchased > 0 && ` + ${purchased.toFixed(1)}% purchased`}
          </span>
        </div>
      </div>
      
      {/* Legend */}
      {showLabels && purchased > 0 && (
        <div className="flex items-center justify-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <span className="text-gray-600">Earned</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600">Purchased</span>
          </div>
        </div>
      )}
    </div>
  );
} 