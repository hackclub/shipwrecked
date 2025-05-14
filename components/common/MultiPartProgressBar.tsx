'use client';

import { useEffect, useState } from 'react';
import styles from './MultiPartProgressBar.module.css';

export interface ProgressSegment {
  value: number;         // Value of this segment
  color: string;         // CSS color (hex, rgb, etc.)
  label?: string;        // Optional label for this segment
  animated?: boolean;    // Whether this segment should be animated
  tooltip?: string;      // Optional tooltip text on hover
  status?: 'completed' | 'in-progress' | 'pending';  // Status of this segment
}

interface MultiPartProgressBarProps {
  segments: ProgressSegment[];   // Array of progress segments
  max?: number;                  // Maximum total value (defaults to sum of all segment values)
  height?: number;               // Height in pixels
  className?: string;            // Additional container class
  showLabels?: boolean;          // Whether to show labels beneath segments
  showPercentages?: boolean;     // Whether to show percentage values
  rounded?: boolean;             // Whether bar edges should be rounded
  showTotal?: boolean;           // Whether to show total progress
  tooltipPosition?: 'top' | 'bottom'; // Position for tooltips
}

export default function MultiPartProgressBar({
  segments,
  max,
  height = 8,
  className = '',
  showLabels = false,
  showPercentages = false,
  rounded = true,
  showTotal = false,
  tooltipPosition = 'top'
}: MultiPartProgressBarProps) {
  const [processedSegments, setProcessedSegments] = useState<Array<ProgressSegment & { width: string; actualWidth: number }>>([]); 
  const [totalValue, setTotalValue] = useState(0);
  const [maxValue, setMaxValue] = useState(0);
  
  // Process segments and calculate widths
  useEffect(() => {
    // Calculate total value from all segments
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    setTotalValue(total);
    
    // Determine max (either provided or calculated)
    const calculatedMax = max || total;
    setMaxValue(calculatedMax);
    
    // Calculate percentage width for each segment
    const processed = segments.map(segment => {
      const percentWidth = (segment.value / calculatedMax) * 100;
      return {
        ...segment,
        width: `${percentWidth}%`, 
        actualWidth: percentWidth
      };
    });
    
    setProcessedSegments(processed);
  }, [segments, max]);

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