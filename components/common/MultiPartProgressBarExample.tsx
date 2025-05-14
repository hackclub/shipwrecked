'use client';

import { useState } from 'react';
import MultiPartProgressBar, { ProgressSegment } from './MultiPartProgressBar';

export default function MultiPartProgressBarExample() {
  // Example: Progress bar showing project hours with color-coded segments
  const [projectHours, setProjectHours] = useState<ProgressSegment[]>([
    {
      value: 15,
      color: '#10b981', // Green
      label: 'Shipped Projects',
      tooltip: '15 hours from shipped projects',
      animated: false,
      status: 'completed'
    },
    {
      value: 25,
      color: '#f59e0b', // Yellow
      label: 'In Progress',
      tooltip: '25 hours from in-progress projects',
      animated: true,
      status: 'in-progress'
    },
    {
      value: 10,
      color: '#3b82f6', // Blue
      label: 'Viral Projects',
      tooltip: '10 hours from viral projects',
      animated: false,
      status: 'completed'
    }
  ]);

  // Example: Progress bar showing a comparison between goal and actual progress
  const [progressData, setProgressData] = useState<ProgressSegment[]>([
    {
      value: 35,
      color: '#ef4444', // Red
      label: 'Remaining',
      tooltip: '35 hours remaining to reach goal',
      animated: false,
      status: 'pending'
    },
    {
      value: 65,
      color: '#10b981', // Green
      label: 'Completed',
      tooltip: '65 hours completed',
      animated: true,
      status: 'completed'
    }
  ]);

  // Example: Progress bar with multiple small segments
  const [detailedProgress, setDetailedProgress] = useState<ProgressSegment[]>([
    { value: 10, color: '#ef4444', label: 'Project A', tooltip: 'Project A: 10 hours' },
    { value: 15, color: '#f59e0b', label: 'Project B', tooltip: 'Project B: 15 hours' },
    { value: 12, color: '#10b981', label: 'Project C', tooltip: 'Project C: 12 hours' },
    { value: 8, color: '#3b82f6', label: 'Project D', tooltip: 'Project D: 8 hours' },
    { value: 5, color: '#8b5cf6', label: 'Project E', tooltip: 'Project E: 5 hours' }
  ]);

  return (
    <div className="space-y-8 p-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Project Hours by Status</h3>
        <p className="text-sm text-gray-600 mb-3">
          Shows distribution of hours across different project statuses.
        </p>
        <MultiPartProgressBar 
          segments={projectHours} 
          height={16}
          showLabels={true}
          showPercentages={true}
          tooltipPosition="top"
        />
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Progress Toward Goal (100 hours)</h3>
        <p className="text-sm text-gray-600 mb-3">
          Shows progress toward the 100-hour goal.
        </p>
        <MultiPartProgressBar 
          segments={progressData} 
          max={100}
          height={12}
          showLabels={true}
          showTotal={true}
        />
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Project Distribution</h3>
        <p className="text-sm text-gray-600 mb-3">
          Shows hours distribution across different projects.
        </p>
        <MultiPartProgressBar 
          segments={detailedProgress}
          height={20}
          showLabels={true}
          rounded={false}
        />
      </div>
    </div>
  );
} 