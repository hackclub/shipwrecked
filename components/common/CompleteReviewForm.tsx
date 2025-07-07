'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useReviewMode } from '@/app/contexts/ReviewModeContext';
import ReviewChecklist from './ReviewChecklist';

interface CompleteReviewFormProps {
  projectID: string;
  isInReview: boolean;
  onReviewCompleted: (updatedProject: any, review: any) => void;
}

export default function CompleteReviewForm({
  projectID,
  isInReview,
  onReviewCompleted
}: CompleteReviewFormProps) {
  const { isReviewMode } = useReviewMode();
  const [comment, setComment] = useState('');
  const [isApproved, setIsApproved] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistJustification, setChecklistJustification] = useState('');

  // Only show this component in review mode AND if the project is in review
  if (!isReviewMode || !isInReview) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If approving and checklist hasn't been completed, show it
    if (isApproved && !checklistJustification) {
      setShowChecklist(true);
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Combine the checklist justification with the comment if approving
      let finalComment = comment.trim();
      if (isApproved && checklistJustification) {
        finalComment = `Justification for approved hours: ${checklistJustification}\n\n${comment.trim()}`.trim();
      }
      
      const response = await fetch('/api/projects/complete-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectID,
          approved: isApproved,
          comment: finalComment,
          justification: isApproved ? checklistJustification : undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete review');
      }
      
      const data = await response.json();
      toast.success('Review completed successfully');
      
      // Clear the form
      setComment('');
      setChecklistJustification('');
      setShowChecklist(false);
      
      // Notify parent component
      onReviewCompleted(data.project, data.review);
    } catch (error) {
      console.error('Error completing review:', error);
      toast.error('Failed to complete review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChecklistComplete = (justification: string) => {
    setChecklistJustification(justification);
    setShowChecklist(false);
  };

  const handleApprovalChange = (approved: boolean) => {
    setIsApproved(approved);
    // Clear checklist justification if switching away from approval
    if (!approved) {
      setChecklistJustification('');
    }
  };
  
  return (
    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
      <h3 className="text-sm font-bold text-green-800 mb-3">Complete Review</h3>
      
      {/* Show checklist if user wants to approve and hasn't completed it */}
      {showChecklist && (
        <ReviewChecklist
          onChecklistComplete={handleChecklistComplete}
          isSubmitting={isSubmitting}
        />
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="reviewComment" className="block text-sm font-medium text-gray-700 mb-1">
            Review Notes (optional)
          </label>
          <textarea
            id="reviewComment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add any notes about your review decision..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isSubmitting}
          />
        </div>
        
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="approve"
              checked={isApproved}
              onChange={() => handleApprovalChange(!isApproved)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 rounded"
            />
            <label htmlFor="approve" className="text-sm font-medium text-gray-700">
              Approve this project
            </label>
          </div>
          {isApproved && !checklistJustification && (
            <p className="text-sm text-green-700 mt-1">
              ✓ You will need to complete a review checklist before approval
            </p>
          )}
          {isApproved && checklistJustification && (
            <p className="text-sm text-green-700 mt-1">
              ✓ Review checklist completed
            </p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Completing Review...' : 'Complete Review'}
        </button>
      </form>
    </div>
  );
} 