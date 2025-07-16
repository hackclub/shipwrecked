'use client';

import React, { useState, useEffect } from 'react';
import ProgressBar from './ProgressBar';

interface ProgressData {
  earned: {
    totalHours: number;
    totalPercentage: number;
    shippedHours: number;
    viralHours: number;
    otherHours: number;
  };
  purchased: {
    hours: number;
    percentage: number;
  };
  total: {
    hours: number;
    percentage: number;
  };
}

interface IslandProgressProps {
  className?: string;
}

export default function IslandProgress({ className = "" }: IslandProgressProps) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch('/api/users/me/shells');
        if (!response.ok) {
          throw new Error('Failed to fetch progress data');
        }
        const data = await response.json();
        setProgressData(data.progress);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load progress');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg p-6 shadow-sm ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded-full mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !progressData) {
    return (
      <div className={`bg-white rounded-lg p-6 shadow-sm ${className}`}>
        <div className="text-center text-gray-500">
          <p>Failed to load progress data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg p-6 shadow-sm ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Progress to Island</h3>
        <ProgressBar 
          earnedProgress={progressData.earned.totalPercentage}
          purchasedProgress={progressData.purchased.percentage}
          totalProgress={progressData.total.percentage}
          showLabels={false}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {progressData.earned.totalHours.toFixed(1)}
          </div>
          <div className="text-gray-600">Hours Earned</div>
        </div>
        
        {progressData.purchased.hours > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {progressData.purchased.hours.toFixed(1)}
            </div>
            <div className="text-gray-600">Hours Purchased</div>
          </div>
        )}
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {progressData.total.hours.toFixed(1)}
          </div>
          <div className="text-gray-600">Total Hours</div>
        </div>
      </div>

      {progressData.purchased.hours > 0 && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <span className="text-green-600">💰</span>
            <span className="text-sm text-green-800">
              You have purchased {progressData.purchased.hours.toFixed(1)} hours of progress!
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 