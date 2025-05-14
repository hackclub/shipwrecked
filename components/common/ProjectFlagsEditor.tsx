'use client';

import { useState, useEffect } from 'react';
import { useReviewMode } from '@/app/contexts/ReviewModeContext';

export interface ProjectFlags {
  shipped: boolean;
  viral: boolean;
  approved: boolean;
  in_review: boolean;
}

interface ProjectFlagsEditorProps {
  projectID: string;
  initialShipped: boolean;
  initialViral: boolean;
  initialApproved: boolean;
  initialInReview: boolean;
  onChange: (flags: ProjectFlags) => void;
}

export default function ProjectFlagsEditor({
  projectID,
  initialShipped,
  initialViral,
  initialApproved,
  initialInReview,
  onChange
}: ProjectFlagsEditorProps) {
  const { isReviewMode } = useReviewMode();
  const [shipped, setShipped] = useState(initialShipped);
  const [viral, setViral] = useState(initialViral);
  const [approved, setApproved] = useState(initialApproved);
  const [inReview, setInReview] = useState(initialInReview);

  // Update state when props change
  useEffect(() => {
    setShipped(initialShipped);
    setViral(initialViral);
    setApproved(initialApproved);
    setInReview(initialInReview);
  }, [initialShipped, initialViral, initialApproved, initialInReview]);

  // Only show editor in review mode
  if (!isReviewMode) {
    return null;
  }

  // Notify parent when flags change
  const handleFlagChange = (field: string, value: boolean) => {
    let newFlags: ProjectFlags = { 
      shipped, 
      viral, 
      approved, 
      in_review: inReview 
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
      case 'approved':
        setApproved(value);
        newFlags.approved = value;
        break;
    }
    
    onChange(newFlags);
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
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="approved"
            checked={approved}
            onChange={() => handleFlagChange('approved', !approved)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
          />
          <label htmlFor="approved" className="text-sm font-medium text-gray-700">Approved</label>
        </div>
      </div>
      
      {inReview && (
        <div className="bg-red-50 p-3 rounded mt-4 text-xs text-red-700">
          <p><strong>Note:</strong> This project is currently in review. Submitting a review will automatically clear the review status.</p>
        </div>
      )}
      
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
        <p>Add a review comment and click <strong>Submit Review</strong> below to save these flag changes.</p>
      </div>
    </div>
  );
} 