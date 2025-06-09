'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  reviewCount: number;
}

interface LeaderboardData {
  timeframe: string;
  leaderboard: LeaderboardEntry[];
  totalReviewers: number;
  totalReviews: number;
}

type TimeframeType = 'today' | 'this_week' | 'all_time';

const timeframeLabels = {
  today: 'Today',
  this_week: 'This Week',
  all_time: 'All Time'
};

export default function ReviewLeaderboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('all_time');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/admin/review-leaderboard?timeframe=${selectedTimeframe}`);
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }
        
        const data = await response.json();
        setData(data);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        setError('Failed to load leaderboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedTimeframe]);

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200';
      case 2: return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200';
      case 3: return 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200';
      default: return 'bg-white border-gray-200';
    }
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 h-[700px] flex flex-col w-full">
        <h3 className="text-xl font-semibold mb-6">Review Leaderboard</h3>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-2">Error loading leaderboard</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 h-[700px] flex flex-col w-full">
      {/* Header with toggle */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Review Leaderboard</h3>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(Object.keys(timeframeLabels) as TimeframeType[]).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedTimeframe === timeframe
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {timeframeLabels[timeframe]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      {data && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Total Reviews: <strong className="text-blue-700">{data.totalReviews}</strong></span>
            <span className="text-gray-700">Active Reviewers: <strong className="text-blue-700">{data.totalReviewers}</strong></span>
          </div>
        </div>
      )}

      {/* Leaderboard content */}
      <div className="flex-grow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-500">Loading leaderboard...</p>
            </div>
          </div>
        ) : !data || data.leaderboard.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl text-gray-300 mb-2">📋</div>
              <p className="text-gray-500">No reviews found for {timeframeLabels[selectedTimeframe].toLowerCase()}</p>
            </div>
          </div>
                 ) : (
           <div className="h-full overflow-y-auto">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
               {data.leaderboard.map((entry) => (
                 <div
                   key={entry.userId}
                   className={`p-4 rounded-lg border ${getRankStyles(entry.rank)} transition-all hover:shadow-sm`}
                 >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* Rank */}
                    <div className="flex items-center justify-center w-8 h-8">
                      {entry.rank <= 3 ? (
                        <span className="text-lg">{getRankEmoji(entry.rank)}</span>
                      ) : (
                        <span className="text-sm font-semibold text-gray-600">#{entry.rank}</span>
                      )}
                    </div>

                    {/* User info */}
                    <div className="flex items-center space-x-3">
                      {entry.image ? (
                        <Image
                          src={entry.image}
                          alt={entry.name}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {entry.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{entry.name}</p>
                        <p className="text-xs text-gray-500">{entry.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Review count */}
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">{entry.reviewCount}</p>
                    <p className="text-xs text-gray-500">
                      review{entry.reviewCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                                 </div>
               </div>
             ))}
             </div>
           </div>
         )}
      </div>
    </div>
  );
} 