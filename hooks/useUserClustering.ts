import { useState, useEffect, useCallback } from 'react';

interface UserClassification {
  category: 'whale' | 'shipper' | 'newbie';
  metrics: {
    totalHours: number;
    projectCount: number;
    shippedProjectCount: number;
  };
  percentiles: {
    hours: number;
    projects: number;
    shipped: number;
  };
  description: string;
}

interface UserClusterAnalysis {
  totalUsers: number;
  clusters: {
    whales: {
      count: number;
      percentage: number;
      users: string[];
      thresholds: {
        minHours: number;
        minProjects: number;
        minShipped: number;
      };
    };
    shippers: {
      count: number;
      percentage: number;
      users: string[];
      thresholds: {
        hourRange: [number, number];
        projectRange: [number, number];
        shippedRange: [number, number];
      };
    };
    newbies: {
      count: number;
      percentage: number;
      users: string[];
      thresholds: {
        maxHours: number;
        maxProjects: number;
        maxShipped: number;
      };
    };
  };
  statistics: {
    hours: {
      mean: number;
      median: number;
      p75: number;
      p90: number;
    };
    projects: {
      mean: number;
      median: number;
      p75: number;
      p90: number;
    };
    shipped: {
      mean: number;
      median: number;
      p75: number;
      p90: number;
    };
  };
  lastUpdated: string;
}

export function useUserClassification(userId?: string) {
  const [classification, setClassification] = useState<UserClassification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClassification = useCallback(async (targetUserId: string) => {
    if (!targetUserId) {
      setClassification(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/analytics/user-clusters?classifyUser=${targetUserId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to classify user: ${response.statusText}`);
      }
      
      const data: UserClassification = await response.json();
      setClassification(data);
    } catch (err) {
      console.error('Error fetching user classification:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setClassification(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchClassification(userId);
    }
  }, [userId, fetchClassification]);

  return {
    classification,
    loading,
    error,
    refetch: userId ? () => fetchClassification(userId) : undefined
  };
}

export function useUserClusterAnalysis() {
  const [analysis, setAnalysis] = useState<UserClusterAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/analytics/user-clusters');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user cluster analysis: ${response.statusText}`);
      }
      
      const data: UserClusterAnalysis = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Error fetching user cluster analysis:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return {
    analysis,
    loading,
    error,
    refetch: fetchAnalysis
  };
}

// Utility function to get color and styling for user categories
export function getUserCategoryStyle(category: UserClassification['category']) {
  switch (category) {
    case 'whale':
      return {
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        label: 'Whale',
        emoji: '🐋',
        description: 'High-impact creator'
      };
    case 'shipper':
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        label: 'Shipper',
        emoji: '🚢',
        description: 'Active contributor'
      };
    case 'newbie':
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Newbie',
        emoji: '🌱',
        description: 'Getting started'
      };
    default:
      return {
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        label: 'Unknown',
        emoji: '❓',
        description: 'Classification unknown'
      };
  }
} 