'use client';

import { useProjectClassification, getClassificationStyle } from '@/hooks/useProjectClassification';

interface ProjectClassificationBadgeProps {
  hours: number;
  showPercentile?: boolean;
  showOutlierIndicator?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ProjectClassificationBadge({
  hours,
  showPercentile = false,
  showOutlierIndicator = true,
  size = 'sm',
  className = ''
}: ProjectClassificationBadgeProps) {
  const { classification, loading, error } = useProjectClassification(hours);

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <div className="animate-pulse bg-gray-200 rounded-full px-2 py-1">
          <span className="text-xs text-transparent">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !classification) {
    return null; // Fail silently - don't show badge if there's an error
  }

  const style = getClassificationStyle(classification.classification);
  
  // Size variations
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span 
        className={`
          inline-flex items-center gap-1 rounded-full font-medium border
          ${style.color} ${style.bgColor} ${style.borderColor}
          ${sizeClasses[size]}
        `}
        title={`${classification.description} (${classification.percentile}th percentile)`}
      >
        {style.label}
        {showPercentile && (
          <span className="opacity-75">
            {classification.percentile}%
          </span>
        )}
        {showOutlierIndicator && classification.isOutlier && (
          <span title="Statistical outlier" className="text-amber-500">
            ⚠️
          </span>
        )}
      </span>
    </div>
  );
} 