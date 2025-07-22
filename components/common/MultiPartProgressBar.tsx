'use client';

import { useEffect, useState, useMemo } from 'react';
import styles from './MultiPartProgressBar.module.css';
import type { ProjectType } from '@/app/api/projects/route';
import type { ProgressMetrics } from '@/lib/project-client';

export interface ProgressSegment {
  value: number;         // Value of this segment
  color: string;         // CSS color (hex, rgb, etc.)
  label?: string;        // Optional label for this segment
  animated?: boolean;    // Whether this segment should be animated
  tooltip?: string;      // Optional tooltip text on hover
  status?: 'completed' | 'in-progress' | 'pending';  // Status of this segment
}

interface MultiPartProgressBarProps {
  segments?: ProgressSegment[];   // Array of progress segments (optional, for backward compatibility)
  projects?: ProjectType[];       // Raw projects data (optional)
  progressMetrics?: ProgressMetrics; // Precomputed metrics (optional)
  progressData?: Record<string, unknown>; // Optional extra progress data (e.g., purchased progress)
  max?: number;                  // Maximum total value (defaults to sum of all segment values)
  height?: number;               // Height in pixels
  className?: string;            // Additional container class
  showLabels?: boolean;          // Whether to show labels beneath segments
  showPercentages?: boolean;     // Whether to show percentage values
  rounded?: boolean;             // Whether bar edges should be rounded
  showTotal?: boolean;           // Whether to show total progress
  tooltipPosition?: 'top' | 'bottom'; // Position for tooltips
}

// Calculate progress segments from raw data
export function calculateProgressSegmentsFromData({
  projects,
  progressMetrics
}: {
  projects?: ProjectType[];
  progressMetrics?: ProgressMetrics;
}): ProgressSegment[] {
  // Use centralized metrics
  const metrics = progressMetrics || { shippedHours: 0, viralHours: 0, otherHours: 0, totalHours: 0, totalPercentage: 0, rawHours: 0, currency: 0, purchasedProgressHours: 0, totalProgressWithPurchased: 0, totalPercentageWithPurchased: 0 };
  if (!projects || !Array.isArray(projects)) {
    return [{ value: 100, color: '#e5e7eb', tooltip: 'No projects found', status: 'pending' }];
  }
  // Convert hours to percentages (based on 60-hour goal)
  const shippedPercentage = (metrics.shippedHours / 60) * 100;
  const viralPercentage = (metrics.viralHours / 60) * 100;
  const otherPercentage = (metrics.otherHours / 60) * 100;
  // Get purchased progress percentage from metrics only
  const purchasedPercentage = metrics.purchasedProgressHours || 0;
  // Create segments array
  const segments: ProgressSegment[] = [];
  if (metrics.shippedHours > 0) {
    segments.push({
      value: shippedPercentage,
      color: '#10b981', // Green
      label: 'Shipped',
      tooltip: `${metrics.shippedHours.toFixed(1)} hours from shipped projects`,
      animated: false,
      status: 'completed'
    });
  }
  if (metrics.viralHours > 0) {
    segments.push({
      value: viralPercentage,
      color: '#f59e0b', // Gold/Yellow
      label: 'Viral',
      tooltip: `${metrics.viralHours.toFixed(1)} hours from viral projects`,
      animated: false,
      status: 'completed'
    });
  }
  if (purchasedPercentage > 0) {
    segments.push({
      value: purchasedPercentage,
      color: '#ec4899',
      label: 'Purchased',
      tooltip: `${purchasedPercentage.toFixed(1)}% purchased from shop`,
      animated: false,
      status: 'completed'
    });
  }

  const totalCompletedProgress = shippedPercentage + viralPercentage + purchasedPercentage;
  
  if (metrics.otherHours > 0 && totalCompletedProgress < 100) {
    segments.push({
      value: otherPercentage,
      color: '#3b82f6', // Blue
      label: 'In Progress',
      tooltip: `${metrics.otherHours.toFixed(1)} hours from in-progress projects`,
      animated: true,
      status: 'in-progress'
    });
  }

  // Calculate total progress including purchased and in-progress (if shown)
  const totalProgressWithPurchased = Math.min((metrics.totalPercentage || 0) + purchasedPercentage, 100);
  if (totalProgressWithPurchased < 100) {
    segments.push({
      value: 100 - totalProgressWithPurchased,
      color: '#e5e7eb', // Light gray
      tooltip: 'Remaining progress needed',
      status: 'pending'
    });
  }
  return segments;
}

export default function MultiPartProgressBar({
  segments,
  projects,
  progressMetrics,
  max,
  height = 8,
  className = '',
  showLabels = false,
  showPercentages = false,
  rounded = true,
  showTotal = false,
  tooltipPosition = 'top'
}: MultiPartProgressBarProps) {
  // Memoize computedSegments to avoid infinite update loop
  const computedSegments = useMemo(
    () => segments || calculateProgressSegmentsFromData({ projects, progressMetrics }),
    [segments, projects, progressMetrics]
  );
  const [processedSegments, setProcessedSegments] = useState<Array<ProgressSegment & { width: string; actualWidth: number }>>([]); 
  const [totalValue, setTotalValue] = useState(0);
  const [maxValue, setMaxValue] = useState(0);
  
  // Process segments and calculate widths
  useEffect(() => {
    // Calculate total value from all segments
    const total = computedSegments.reduce((sum, segment) => sum + segment.value, 0);
    setTotalValue(total);
    
    // Determine max (either provided or calculated)
    const calculatedMax = max || total;
    setMaxValue(calculatedMax);
    
    // Calculate percentage width for each segment
    const processed = computedSegments.map(segment => {
      const percentWidth = (segment.value / calculatedMax) * 100;
      return {
        ...segment,
        width: `${percentWidth}%`, 
        actualWidth: percentWidth
      };
    });
    
    setProcessedSegments(processed);
  }, [computedSegments, max]);

  return (
    <div className={`${styles.container} ${className}`}>
      <div 
        className={`${styles.track} ${rounded ? styles.rounded : ''}`}
        style={{ height: `${height}px` }}
      >
        {processedSegments.map((segment, index) => (
          <div
            key={index}
            className={`
              ${styles.segment} 
              ${segment.animated ? styles.animated : ''} 
              ${segment.status ? styles[segment.status] : ''}
            `}
            style={{ 
              width: segment.width,
              backgroundColor: segment.color,
              height: '100%',
              // Apply rounded corners only to first/last segments if rounded is true
              borderTopLeftRadius: rounded && index === 0 ? '9999px' : '0',
              borderBottomLeftRadius: rounded && index === 0 ? '9999px' : '0',
              borderTopRightRadius: rounded && index === processedSegments.length - 1 ? '9999px' : '0',
              borderBottomRightRadius: rounded && index === processedSegments.length - 1 ? '9999px' : '0',
            }}
            data-tooltip={segment.tooltip}
            data-tooltip-position={tooltipPosition}
            data-status={segment.status}
          />
        ))}
      </div>
      
      {/* Labels row (optional) */}
      {showLabels && (
        <div className={styles.labels}>
          {processedSegments.map((segment, index) => (
            <div 
              key={`label-${index}`} 
              className={styles.labelItem}
              style={{ 
                width: segment.width,
                color: segment.color
              }}
            >
              {segment.label || ''}
              {showPercentages && ` (${segment.actualWidth.toFixed(1)}%)`}
            </div>
          ))}
        </div>
      )}
      
      {/* Total progress (optional) */}
      {showTotal && (
        <div className={styles.totalProgress}>
          Total: {totalValue} / {maxValue} ({((totalValue / maxValue) * 100).toFixed(1)}%)
        </div>
      )}
    </div>
  );
} 