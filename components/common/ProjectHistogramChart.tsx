'use client';

import { useHistogramAnalysis } from '@/hooks/useProjectClassification';

interface HistogramBin {
  min: number;
  max: number;
  count: number;
  projects: string[];
}

interface ProjectHistogramChartProps {
  className?: string;
}

export default function ProjectHistogramChart({ className = '' }: ProjectHistogramChartProps) {
  const { analysis, loading, error } = useHistogramAnalysis();

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="flex items-end space-x-1 h-32">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-gray-200 rounded-t flex-1"
                style={{ height: `${Math.random() * 80 + 20}%` }}
              ></div>
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
              Unable to load project hours distribution. Classification badges may not be available.
            </p>
          </div>
        </div>
      </div>
    );
  }

     const maxCount = analysis.bins.length > 0 ? Math.max(...analysis.bins.map(bin => bin.count)) : 0;
   const totalProjects = analysis.bins.reduce((sum, bin) => sum + bin.count, 0);

   // Debug logging
   console.log('Histogram data:', {
     bins: analysis.bins,
     maxCount,
     totalProjects,
     binsLength: analysis.bins.length
   });

  // Function to get color based on percentile thresholds
  const getBinColor = (binMin: number, binMax: number) => {
    const binMidpoint = (binMin + binMax) / 2;
    
    if (binMidpoint < analysis.classifications.veryLow) {
      return 'bg-red-400 hover:bg-red-500';
    } else if (binMidpoint < analysis.classifications.low) {
      return 'bg-orange-400 hover:bg-orange-500';
    } else if (binMidpoint < analysis.classifications.normal) {
      return 'bg-green-400 hover:bg-green-500';
    } else if (binMidpoint < analysis.classifications.high) {
      return 'bg-blue-400 hover:bg-blue-500';
    } else {
      return 'bg-purple-400 hover:bg-purple-500';
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 overflow-hidden ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Project Hours Distribution
        </h3>
        <p className="text-sm text-gray-600">
          Distribution of {totalProjects} projects by hours worked. Colors match the classification system.
        </p>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-lg font-semibold text-gray-900">
            {analysis.mean.toFixed(1)}h
          </div>
          <div className="text-xs text-gray-500">Mean</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-lg font-semibold text-gray-900">
            {analysis.median.toFixed(1)}h
          </div>
          <div className="text-xs text-gray-500">Median</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-lg font-semibold text-gray-900">
            {analysis.percentiles.p75.toFixed(1)}h
          </div>
          <div className="text-xs text-gray-500">75th %ile</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-lg font-semibold text-gray-900">
            {analysis.percentiles.p90.toFixed(1)}h
          </div>
          <div className="text-xs text-gray-500">90th %ile</div>
        </div>
      </div>

      {/* Histogram Chart */}
      <div className="relative overflow-hidden">
        {analysis.bins.length === 0 ? (
          <div className="h-48 bg-gray-50 rounded-lg p-4 flex items-center justify-center">
            <p className="text-gray-500">No histogram data available</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="relative h-48 mb-8 bg-gray-50 rounded-lg p-2 overflow-hidden">
              <div className="flex items-end justify-between h-full space-x-1">
                {analysis.bins.map((bin, index) => {
                  // Calculate height as pixels, not percentage, for better control
                  const maxBarHeight = 176; // 44 * 4 (h-44 in pixels minus padding)
                  const heightPx = maxCount > 0 ? Math.max((bin.count / maxCount) * maxBarHeight, bin.count > 0 ? 8 : 2) : 2;
                  const percentage = totalProjects > 0 ? ((bin.count / totalProjects) * 100) : 0;
                  
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col justify-end group relative"
                      style={{ minWidth: '8px', maxWidth: '40px' }}
                    >
                      <div
                        className={`rounded-t transition-colors duration-200 ${getBinColor(bin.min, bin.max)}`}
                        style={{ 
                          height: `${heightPx}px`,
                          minHeight: bin.count > 0 ? '8px' : '2px'
                        }}
                        title={`${bin.min.toFixed(1)}h - ${bin.max.toFixed(1)}h: ${bin.count} projects (${percentage.toFixed(1)}%)`}
                      >
                        {/* Count label on top of bar for non-zero counts */}
                        {bin.count > 0 && (
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-700 whitespace-nowrap">
                            {bin.count}
                          </div>
                        )}
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                            <div className="font-medium">
                              {bin.min.toFixed(1)}h - {bin.max.toFixed(1)}h
                            </div>
                            <div>
                              {bin.count} projects ({percentage.toFixed(1)}%)
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* X-axis labels with proper overflow handling */}
            {analysis.bins.length > 0 && (
              <div className="flex justify-between px-2 -mt-4">
                {analysis.bins.map((bin, index) => {
                  // Only show labels for every nth bin if there are too many, but ensure we show first and last
                  const isFirst = index === 0;
                  const isLast = index === analysis.bins.length - 1;
                  const shouldShow = analysis.bins.length <= 10 || 
                                   isFirst || 
                                   isLast || 
                                   index % Math.max(1, Math.ceil(analysis.bins.length / 6)) === 0;
                  
                  return (
                    <div key={index} className="flex-1 text-center relative" style={{ minWidth: '8px' }}>
                      {shouldShow && (
                        <div className="text-xs text-gray-500 px-1">
                          {/* Show range for better clarity, or just the min value for shorter display */}
                          {bin.max - bin.min < 1 ? 
                            `${bin.min.toFixed(1)}h` : 
                            bin.min < 1 ? 
                              `${bin.min.toFixed(1)}h` : 
                              `${Math.round(bin.min)}h`
                          }
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-400 rounded flex-shrink-0"></div>
            <span className="text-gray-600">Very Low (&lt; {analysis.classifications.veryLow.toFixed(1)}h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-400 rounded flex-shrink-0"></div>
            <span className="text-gray-600">Below Average</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded flex-shrink-0"></div>
            <span className="text-gray-600">Average</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-400 rounded flex-shrink-0"></div>
            <span className="text-gray-600">Above Average</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-400 rounded flex-shrink-0"></div>
            <span className="text-gray-600">Very High (&gt; {analysis.classifications.high.toFixed(1)}h)</span>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Last updated: {new Date(analysis.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
} 