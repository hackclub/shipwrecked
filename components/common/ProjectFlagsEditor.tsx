'use client';

import { useState, useEffect } from 'react';
import { useReviewMode } from '@/app/contexts/ReviewModeContext';

export interface ProjectFlags {
  shipped: boolean;
  viral: boolean;
  in_review: boolean;
  hoursOverride?: number;
}

interface ProjectFlagsEditorProps {
  projectID: string;
  initialShipped: boolean;
  initialViral: boolean;
  initialInReview: boolean;
  initialHoursOverride?: number;
  rawHours?: number;
  onChange: (flags: ProjectFlags) => void;
}

export default function ProjectFlagsEditor({
  projectID,
  initialShipped,
  initialViral,
  initialInReview,
  initialHoursOverride,
  rawHours,
  onChange
}: ProjectFlagsEditorProps) {
  const { isReviewMode } = useReviewMode();
  const [shipped, setShipped] = useState(initialShipped);
  const [viral, setViral] = useState(initialViral);
  const [inReview, setInReview] = useState(initialInReview);
  const [hoursOverride, setHoursOverride] = useState<number | undefined>(initialHoursOverride);

  // Update state when props change
  useEffect(() => {
    setShipped(initialShipped);
    setViral(initialViral);
    setInReview(initialInReview);
    setHoursOverride(initialHoursOverride);
    
    // Add debugging
    console.log('ProjectFlagsEditor received initialHoursOverride:', initialHoursOverride);
  }, [initialShipped, initialViral, initialInReview, initialHoursOverride]);

  // Only show editor in review mode
  if (!isReviewMode) {
    return null;
  }

  // Notify parent when flags change
  const handleFlagChange = (field: string, value: boolean) => {
    let newFlags: ProjectFlags = { 
      shipped, 
      viral, 
      in_review: inReview,
      hoursOverride
    };
    
    switch (field) {
      case 'shipped':
        setShipped(value);
        newFlags.shipped = value;
        break;
      case 'viral':
        setViral(value);
        newFlags.viral = value;
        break;
    }
    onChange(newFlags);
  };

  // Notify parent when hoursOverride changes
  const handleHoursOverrideChange = (value: string) => {
    const num = value === '' ? undefined : Number(value);
    setHoursOverride(num);
    onChange({ shipped, viral, in_review: inReview, hoursOverride: num });
  };

  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <h3 className="text-sm font-bold text-blue-800 mb-3">Review Mode: Project Status Flags</h3>
      
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="shipped"
            checked={shipped}
            onChange={() => handleFlagChange('shipped', !shipped)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
          />
          <label htmlFor="shipped" className="text-sm font-medium text-gray-700">Shipped</label>
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="viral"
            checked={viral}
            onChange={() => handleFlagChange('viral', !viral)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
          />
          <label htmlFor="viral" className="text-sm font-medium text-gray-700">Viral</label>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="hoursOverride" className="block text-sm font-medium text-gray-700 mb-1">Override Hours (optional)</label>
        <input
          type="number"
          id="hoursOverride"
          value={hoursOverride ?? ''}
          min={0}
          step={0.01}
          onChange={e => handleHoursOverrideChange(e.target.value)}
          className="w-32 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. 12.5"
        />
        {typeof rawHours === 'number' && (
          <span className="ml-3 text-xs text-gray-500">(Hackatime reported: {rawHours}h)</span>
        )}
      </div>
      
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
        <p>Add a review comment and click <strong>Submit Review</strong> below to save these flag changes.</p>
      </div>
    </div>
  );
} 