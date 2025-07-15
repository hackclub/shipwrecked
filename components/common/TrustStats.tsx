'use client';

import { useState, useEffect } from 'react';

interface TrustStats {
  trust_level: string;
  suspected: boolean;
  banned: boolean;
  admin_level: string;
  stats: {
    total_heartbeats: number;
    total_coding_time: number;
    languages_used: number;
    projects_worked_on: number;
    days_active: number;
  };
}

interface TrustStatsProps {
  hackatimeId: string;
  userName?: string;
  size?: 'sm' | 'md' | 'lg';
  showStats?: boolean;
}

// Convert trust level to emoji
const getTrustLevelEmoji = (trustLevel: string): string => {
  switch (trustLevel) {
    case 'blue': return '🔵'; // unscored
    case 'red': return '🔴'; // convicted
    case 'green': return '🟢'; // trusted
    case 'yellow': return '🟡'; // suspected
    default: return '⚪'; // unknown
  }
};

// Get trust level description
const getTrustLevelDescription = (trustLevel: string): string => {
  switch (trustLevel) {
    case 'blue': return 'Unscored';
    case 'red': return 'Convicted';
    case 'green': return 'Trusted';
    case 'yellow': return 'Suspected';
    default: return 'Unknown';
  }
};

// Get trust level color for styling
const getTrustLevelColor = (trustLevel: string): string => {
  switch (trustLevel) {
    case 'blue': return 'text-blue-600';
    case 'red': return 'text-red-600';
    case 'green': return 'text-green-600';
    case 'yellow': return 'text-yellow-600';
    default: return 'text-gray-600';
  }
};

export default function TrustStats({ 
  hackatimeId, 
  userName = 'User', 
  size = 'md', 
  showStats = false 
}: TrustStatsProps) {
  const [trustData, setTrustData] = useState<TrustStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchTrustData = async () => {
      if (!hackatimeId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/hackatime/user-trust?hackatimeId=${hackatimeId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('User not found in Hackatime');
          } else if (response.status === 403) {
            setError('Access denied');
          } else {
            setError('Failed to fetch trust data');
          }
          return;
        }
        
        const data = await response.json();
        setTrustData(data);
      } catch (err) {
        console.error('Error fetching trust data:', err);
        setError('Failed to fetch trust data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrustData();
  }, [hackatimeId]);

  if (!hackatimeId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-1">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
        <span className="text-xs text-gray-500">Loading trust...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inline-flex items-center gap-1">
        <span className="text-gray-400" title={error}>❓</span>
        {size !== 'sm' && (
          <span className="text-xs text-gray-500">Trust unavailable</span>
        )}
      </div>
    );
  }

  if (!trustData) {
    return null;
  }

  const emoji = getTrustLevelEmoji(trustData.trust_level);
  const description = getTrustLevelDescription(trustData.trust_level);
  const colorClass = getTrustLevelColor(trustData.trust_level);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="inline-flex items-center gap-1">
      <div className="relative">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`inline-flex items-center gap-1 hover:opacity-80 transition-opacity ${sizeClasses[size]}`}
          title={`Trust Level: ${description}${trustData.suspected ? ' (Suspected)' : ''}${trustData.banned ? ' (Banned)' : ''}`}
        >
          <span className="select-none">{emoji}</span>
          {size !== 'sm' && (
            <span className={`text-xs font-medium ${colorClass}`}>
              {description}
            </span>
          )}
          {(trustData.suspected || trustData.banned) && (
            <span className="text-xs text-red-600 font-bold">
              {trustData.banned ? '🚫' : '⚠️'}
            </span>
          )}
        </button>

        {/* Expanded stats tooltip */}
        {isExpanded && showStats && (
          <div className="absolute z-50 mt-1 left-0 bg-white shadow-lg rounded-lg border border-gray-200 p-3 min-w-64">
            <div className="text-sm font-medium text-gray-900 mb-2">
              Trust Stats for {userName}
            </div>
            
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Trust Level:</span>
                <span className={`font-medium ${colorClass}`}>
                  {emoji} {description}
                </span>
              </div>
              
              {trustData.suspected && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-red-600 font-medium">⚠️ Suspected</span>
                </div>
              )}
              
              {trustData.banned && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-red-600 font-medium">🚫 Banned</span>
                </div>
              )}
              
              <hr className="my-2 border-gray-200" />
              
              <div className="flex justify-between">
                <span className="text-gray-600">Total Coding Time:</span>
                <span className="font-medium">
                  {formatTime(trustData.stats.total_coding_time)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Total Heartbeats:</span>
                <span className="font-medium">
                  {trustData.stats.total_heartbeats.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Languages Used:</span>
                <span className="font-medium">
                  {trustData.stats.languages_used}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Projects Worked On:</span>
                <span className="font-medium">
                  {trustData.stats.projects_worked_on}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Days Active:</span>
                <span className="font-medium">
                  {trustData.stats.days_active}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Click outside to close */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}
