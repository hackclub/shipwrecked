'use client';

import { useUserClassification, getUserCategoryStyle } from '@/hooks/useUserClustering';

interface UserCategoryBadgeProps {
  userId: string;
  size?: 'small' | 'medium' | 'large';
  showMetrics?: boolean;
  className?: string;
}

export default function UserCategoryBadge({
  userId,
  size = 'medium',
  showMetrics = false,
  className = ''
}: UserCategoryBadgeProps) {
  const { classification, loading, error } = useUserClassification(userId);

  if (loading) {
    return (
      <div className={`inline-flex items-center animate-pulse ${className}`}>
        <div className="w-16 h-5 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error || !classification) {
    return null; // Silently fail for better UX
  }

  const style = getUserCategoryStyle(classification.category);
  
  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-1',
    large: 'text-base px-4 py-2'
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`
          inline-flex items-center gap-1 rounded-full font-medium
          ${style.color} ${style.bgColor} ${style.borderColor}
          border ${sizeClasses[size]}
        `}
        title={`${style.description}: ${classification.description}`}
      >
        <span className="text-xs">{style.emoji}</span>
        <span>{style.label}</span>
      </span>
      
      {showMetrics && (
        <div className="text-xs text-gray-500 space-x-2">
          <span>{classification.metrics.totalHours.toFixed(1)}h</span>
          <span>•</span>
          <span>{classification.metrics.projectCount} projects</span>
          <span>•</span>
          <span>{classification.metrics.shippedProjectCount} shipped</span>
        </div>
      )}
    </div>
  );
} 