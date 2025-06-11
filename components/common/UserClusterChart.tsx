'use client';

import { useUserClusterAnalysis } from '@/hooks/useUserClustering';

interface UserClusterChartProps {
  className?: string;
}

export default function UserClusterChart({ className = '' }: UserClusterChartProps) {
  const { analysis, loading, error } = useUserClusterAnalysis();

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-gray-200 rounded h-20"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-yellow-500">⚠️</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Unable to load user cluster analysis. User categorization may not be available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { clusters, statistics, totalUsers } = analysis;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          User Activity Clusters
        </h3>
        <p className="text-sm text-gray-600">
          Distribution of {totalUsers} active users by engagement patterns across hours, projects, and shipping.
        </p>
      </div>

      {/* Cluster Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Whales */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐋</span>
              <h4 className="font-semibold text-purple-900">Whales</h4>
            </div>
            <span className="text-sm text-purple-600 font-medium">
              {clusters.whales.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-900 mb-1">
            {clusters.whales.count}
          </div>
          <div className="text-xs text-purple-600">
            High-impact creators with {clusters.whales.thresholds.minHours.toFixed(1)}h+, {clusters.whales.thresholds.minProjects}+ projects, {clusters.whales.thresholds.minShipped}+ shipped
          </div>
        </div>

        {/* Shippers */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚢</span>
              <h4 className="font-semibold text-blue-900">Shippers</h4>
            </div>
            <span className="text-sm text-blue-600 font-medium">
              {clusters.shippers.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-900 mb-1">
            {clusters.shippers.count}
          </div>
          <div className="text-xs text-blue-600">
            Active contributors with balanced engagement and shipping activity
          </div>
        </div>

        {/* Newbies */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌱</span>
              <h4 className="font-semibold text-green-900">Newbies</h4>
            </div>
            <span className="text-sm text-green-600 font-medium">
              {clusters.newbies.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="text-2xl font-bold text-green-900 mb-1">
            {clusters.newbies.count}
          </div>
          <div className="text-xs text-green-600">
            Getting started with ≤{clusters.newbies.thresholds.maxHours.toFixed(1)}h, ≤{clusters.newbies.thresholds.maxProjects} projects, {clusters.newbies.thresholds.maxShipped} shipped
          </div>
        </div>
      </div>

      {/* Visual Distribution */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Distribution Overview</h4>
        <div className="flex h-8 rounded-lg overflow-hidden border border-gray-200">
          <div 
            className="bg-purple-400 flex items-center justify-center text-white text-sm font-medium"
            style={{ width: `${clusters.whales.percentage}%` }}
            title={`Whales: ${clusters.whales.count} users (${clusters.whales.percentage.toFixed(1)}%)`}
          >
            {clusters.whales.percentage > 10 ? '🐋' : ''}
          </div>
          <div 
            className="bg-blue-400 flex items-center justify-center text-white text-sm font-medium"
            style={{ width: `${clusters.shippers.percentage}%` }}
            title={`Shippers: ${clusters.shippers.count} users (${clusters.shippers.percentage.toFixed(1)}%)`}
          >
            {clusters.shippers.percentage > 10 ? '🚢' : ''}
          </div>
          <div 
            className="bg-green-400 flex items-center justify-center text-white text-sm font-medium"
            style={{ width: `${clusters.newbies.percentage}%` }}
            title={`Newbies: ${clusters.newbies.count} users (${clusters.newbies.percentage.toFixed(1)}%)`}
          >
            {clusters.newbies.percentage > 10 ? '🌱' : ''}
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-md font-medium text-gray-900 mb-3">Community Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-semibold text-gray-900">
              {statistics.hours.mean.toFixed(1)}h
            </div>
            <div className="text-xs text-gray-500">Avg Hours</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-semibold text-gray-900">
              {statistics.projects.mean.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">Avg Projects</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-semibold text-gray-900">
              {statistics.shipped.mean.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">Avg Shipped</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-semibold text-gray-900">
              {statistics.hours.median.toFixed(1)}h
            </div>
            <div className="text-xs text-gray-500">Median Hours</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-semibold text-gray-900">
              {statistics.projects.median.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">Median Projects</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-semibold text-gray-900">
              {statistics.shipped.median.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">Median Shipped</div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Last updated: {new Date(analysis.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
} 