'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useReviewMode } from '@/app/contexts/ReviewModeContext';

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
  
  return (
    <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
      <h3 className="text-sm font-bold text-amber-800 mb-3">Submit for Review</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="reviewComment" className="block text-sm font-medium text-gray-700 mb-1">
            What needs to be reviewed?
          </label>
          <textarea
            id="reviewComment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="E.g., Please confirm this project qualifies as 'shipped' or 'viral'. Provide any relevant details to support your request."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            disabled={isSubmitting}
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