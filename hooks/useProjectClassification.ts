import { useState, useEffect, useCallback } from 'react';

interface ProjectClassification {
  classification: 'very-low' | 'low' | 'normal' | 'high' | 'very-high';
  percentile: number;
  isOutlier: boolean;
  description: string;
}

interface HistogramAnalysis {
  bins: Array<{
    min: number;
    max: number;
    count: number;
    projects: string[];
  }>;
  mean: number;
  median: number;
  standardDeviation: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  outlierThresholds: {
    lower: number;
    upper: number;
  };
  classifications: {
    veryLow: number;
    low: number;
    normal: number;
    high: number;
    veryHigh: number;
  };
  lastUpdated: string;
}

export function useProjectClassification(hours?: number) {
  const [classification, setClassification] = useState<ProjectClassification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClassification = useCallback(async (projectHours: number) => {
    if (projectHours <= 0) {
      setClassification(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/analytics/project-histogram?classifyHours=${projectHours}`);
      
      if (!response.ok) {
        throw new Error(`Failed to classify project hours: ${response.statusText}`);
      }
      
      const data: ProjectClassification = await response.json();
      setClassification(data);
    } catch (err) {
      console.error('Error fetching project classification:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setClassification(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hours !== undefined) {
      fetchClassification(hours);
    }
  }, [hours, fetchClassification]);

  return {
    classification,
    loading,
    error,
    refetch: hours !== undefined ? () => fetchClassification(hours) : undefined
  };
}

export function useHistogramAnalysis() {
  const [analysis, setAnalysis] = useState<HistogramAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/analytics/project-histogram');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch histogram analysis: ${response.statusText}`);
      }
      
      const data: HistogramAnalysis = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Error fetching histogram analysis:', err);
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

// Utility function to get color and styling for classification
export function getClassificationStyle(classification: ProjectClassification['classification']) {
  switch (classification) {
    case 'very-low':
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Very Low'
      };
    case 'low':
      return {
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: 'Below Average'
      };
    case 'normal':
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Average'
      };
    case 'high':
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        label: 'Above Average'
      };
    case 'very-high':
      return {
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        label: 'Very High'
      };
    default:
      return {
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        label: 'Unknown'
      };
  }
} 