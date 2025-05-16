'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useReviewMode } from '@/app/contexts/ReviewModeContext';

// Define review request types
export type ReviewRequestType = 'ShippedApproval' | 'ViralApproval' | 'HoursApproval' | 'Other';

interface ProjectReviewRequestProps {
  projectID: string;
  isInReview: boolean;
  onRequestSubmitted: (updatedProject: any, review: any) => void;
}

export default function ProjectReviewRequest({
  projectID,
  isInReview,
  onRequestSubmitted
}: ProjectReviewRequestProps) {
  const { isReviewMode } = useReviewMode();
  const [comment, setComment] = useState('');
  const [reviewType, setReviewType] = useState<ReviewRequestType>('ShippedApproval');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Don't show this component in review mode or if project is already in review
  if (isReviewMode || isInReview) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      toast.error('Please specify what you need reviewed');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/projects/review-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectID,
          comment: comment.trim(),
          reviewType,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit project for review');
      }
      
      const data = await response.json();
      toast.success('Project submitted for review');
      
      // Clear the form
      setComment('');
      
      // Notify parent component
      onRequestSubmitted(data.project, data.review);
    } catch (error) {
      console.error('Error submitting project for review:', error);
      toast.error('Failed to submit project for review');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper text based on selected review type
  const getPlaceholderText = () => {
    switch (reviewType) {
      case 'ShippedApproval':
        return "Explain why this project should be approved as 'shipped'. Include any relevant details about deployment and functionality.";
      case 'ViralApproval':
        return "Explain why this project should be considered 'viral'. Include metrics, social media presence, or other evidence of its popularity.";
      case 'HoursApproval':
        return "Provide details about the hours spent on this project and why they should be approved.";
      case 'Other':
        return "Specify what you need reviewed about this project.";
      default:
        return "Provide details about your review request.";
    }
  };
  
  return (
    <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
      <h3 className="text-sm font-bold text-amber-800 mb-3">Submit for Review</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="reviewType" className="block text-sm font-medium text-gray-700 mb-1">
            What type of review do you need?*
          </label>
          <select
            id="reviewType"
            value={reviewType}
            onChange={(e) => setReviewType(e.target.value as ReviewRequestType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            disabled={isSubmitting}
            required
          >
            <option value="ShippedApproval">I want this project approved as shipped</option>
            <option value="ViralApproval">I want this project approved as viral</option>
            <option value="HoursApproval">I want this project's currently reported hours to be approved</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        <div className="mb-3">
          <label htmlFor="reviewComment" className="block text-sm font-medium text-gray-700 mb-1">
            Additional details*
          </label>
          <textarea
            id="reviewComment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={getPlaceholderText()}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            disabled={isSubmitting}
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting || !comment.trim()}
          className="w-full px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit for Review'}
        </button>
      </form>
    </div>
  );
} 