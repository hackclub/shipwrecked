'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Icon from '@hackclub/icons';
import { useReviewMode } from '@/app/contexts/ReviewModeContext';
import ProjectFlagsEditor, { ProjectFlags } from './ProjectFlagsEditor';

interface ReviewerInfo {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface ReviewType {
  id: string;
  comment: string;
  createdAt: string;
  projectID: string;
  reviewerId: string;
  reviewer: ReviewerInfo;
}

interface ReviewSectionProps {
  projectID: string;
  initialFlags?: ProjectFlags;
  onFlagsUpdated?: (updatedProject: any) => void;
  rawHours?: number;
}

export default function ReviewSection({ 
  projectID, 
  initialFlags,
  onFlagsUpdated,
  rawHours
}: ReviewSectionProps) {
  const { data: session } = useSession();
  const { isReviewMode } = useReviewMode();
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingReviews, setIsFetchingReviews] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // State to track flag changes
  const [flagsChanged, setFlagsChanged] = useState(false);
  const [currentFlags, setCurrentFlags] = useState<ProjectFlags>(initialFlags || {
    shipped: false,
    viral: false,
    in_review: false,
    hoursOverride: undefined
  });
  const [originalFlags, setOriginalFlags] = useState<ProjectFlags>(initialFlags || {
    shipped: false,
    viral: false,
    in_review: false,
    hoursOverride: undefined
  });

  // Add debugging
  console.log('ReviewSection received initialFlags:', initialFlags);
  console.log('ReviewSection received rawHours:', rawHours);

  // Update flags when initialFlags changes
  useEffect(() => {
    if (initialFlags) {
      setCurrentFlags(initialFlags);
      setOriginalFlags(initialFlags);
    }
  }, [initialFlags]);

  // Fetch reviews for the project
  const fetchReviews = async () => {
    if (!projectID) return;
    
    try {
      setIsFetchingReviews(true);
      const response = await fetch(`/api/reviews?projectId=${projectID}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }
      
      const data = await response.json();
      setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setIsFetchingReviews(false);
    }
  };

  // Load reviews when component mounts or projectID changes
  useEffect(() => {
    fetchReviews();
  }, [projectID]);
  
  // Handle flag changes from ProjectFlagsEditor
  const handleFlagsChange = (flags: ProjectFlags) => {
    setCurrentFlags(flags);
    // Check if any flags have changed
    const hasChanges =
      flags.shipped !== originalFlags.shipped ||
      flags.viral !== originalFlags.viral ||
      flags.in_review !== originalFlags.in_review ||
      flags.hoursOverride !== originalFlags.hoursOverride;
    setFlagsChanged(hasChanges);
  };
  
  // Generate a description of flag changes for the review comment
  const getFlagChangesDescription = (): string => {
    const changes: string[] = [];
    if (currentFlags.shipped !== originalFlags.shipped) {
      changes.push(`Shipped: ${originalFlags.shipped ? 'Yes' : 'No'} → ${currentFlags.shipped ? 'Yes' : 'No'}`);
    }
    if (currentFlags.viral !== originalFlags.viral) {
      changes.push(`Viral: ${originalFlags.viral ? 'Yes' : 'No'} → ${currentFlags.viral ? 'Yes' : 'No'}`);
    }
    if (currentFlags.hoursOverride !== originalFlags.hoursOverride) {
      changes.push(`Override Hours: ${originalFlags.hoursOverride ?? 'unset'} → ${currentFlags.hoursOverride ?? 'unset'}`);
    }
    if (currentFlags.in_review !== originalFlags.in_review) {
      changes.push(`In Review: ${originalFlags.in_review ? 'Yes' : 'No'} → ${currentFlags.in_review ? 'Yes' : 'No'}`);
    }
    // Add "Review completed" indicator if the project was in review
    const reviewCompleted = originalFlags.in_review && !currentFlags.in_review;
    if (changes.length === 0 && !reviewCompleted) return '';
    if (reviewCompleted) {
      return '\n\n[✓ Review completed' + (changes.length > 0 ? '. Status changes: ' + changes.join(', ') : '') + ']';
    } else {
      return '\n\n[Status changes: ' + changes.join(', ') + ']';
    }
  };

  // Submit a new review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Store whether the project was in review before changes
      const wasInReview = originalFlags.in_review;
      
      // Always set in_review to false when submitting a review
      const updatedFlags = {
        ...currentFlags,
        in_review: false
      };
      
      // Check if flags are different after setting in_review to false
      const hasChanges =
        updatedFlags.shipped !== originalFlags.shipped ||
        updatedFlags.viral !== originalFlags.viral ||
        updatedFlags.in_review !== originalFlags.in_review ||
        updatedFlags.hoursOverride !== originalFlags.hoursOverride;
      
      // Update current flags and mark as changed
      setCurrentFlags(updatedFlags);
      setFlagsChanged(hasChanges || wasInReview);
      
      // Update flags if they've changed or if review is completed
      if (hasChanges || wasInReview) {
        const flagsResponse = await fetch('/api/projects/flags', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectID,
            ...updatedFlags
          }),
        });
        
        if (!flagsResponse.ok) {
          throw new Error('Failed to update project flags');
        }
        
        const updatedProject = await flagsResponse.json();
        
        // Notify parent component of the flag updates
        if (onFlagsUpdated) {
          onFlagsUpdated(updatedProject);
        }
        
        // Update original flags to match current flags
        setOriginalFlags(updatedFlags);
        setFlagsChanged(false);
      }
      
      // Then submit the review with flag changes noted in the comment
      const finalComment = newComment.trim() + getFlagChangesDescription();
      
      // Double check that the review completed message is included if this was in review
      const reviewComment = finalComment.includes('Review completed') || !wasInReview
        ? finalComment
        : finalComment + '\n\n[✓ Review completed]';
      
      const reviewResponse = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectID,
          comment: reviewComment,
        }),
      });
      
      if (!reviewResponse.ok) {
        throw new Error('Failed to submit review');
      }
      
      const newReview = await reviewResponse.json();
      
      // Add the new review to the top of the list
      setReviews([newReview, ...reviews]);
      setNewComment('');
      toast.success('Review submitted successfully');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a review
  const handleDeleteReview = async (reviewId: string) => {
    try {
      setIsDeletingReview(reviewId);
      const response = await fetch(`/api/reviews?id=${reviewId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete review');
      }
      
      // Remove the deleted review from the list
      setReviews(reviews.filter(review => review.id !== reviewId));
      toast.success('Review deleted successfully');
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    } finally {
      setIsDeletingReview(null);
      setShowDeleteConfirm(null);
    }
  };
  
  // Check if the current user is the reviewer
  const isCurrentUserReviewer = (reviewerId: string) => {
    return session?.user?.id === reviewerId;
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg mb-12">
      <h3 className="text-lg font-semibold border-b pb-2">Project Reviews</h3>
      
      {/* Project Flags Editor */}
      {isReviewMode && initialFlags && (
        <ProjectFlagsEditor
          projectID={projectID}
          initialShipped={initialFlags.shipped}
          initialViral={initialFlags.viral}
          initialInReview={initialFlags.in_review}
          initialHoursOverride={initialFlags.hoursOverride}
          rawHours={rawHours}
          onChange={handleFlagsChange}
        />
      )}
      
      {/* Add new review form - only visible in review mode */}
      {isReviewMode && (
        <form onSubmit={handleSubmitReview} className="mb-6">
          <div className="mb-3">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
              Add a Review
            </label>
            <textarea
              id="comment"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Please provide good commentary explaining the result of your review, with concrete follow-ups required of the project author"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !newComment.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Submitting...' : (flagsChanged ? 'Submit Review with Flag Changes' : 'Submit Review')}
          </button>
          
          {/* Preview of review content */}
          {newComment.trim() && (
            <div className="mt-2 text-xs text-blue-600">
              <p>Preview:</p>
              <pre className="mt-1 p-2 bg-gray-50 rounded text-xs whitespace-pre-wrap">{newComment.trim()}{
                flagsChanged ? getFlagChangesDescription() : (initialFlags?.in_review ? '\n\n[✓ Review completed]' : '')
              }</pre>
            </div>
          )}
          
          {/* Existing flag change preview */}
          {flagsChanged && !newComment.trim() && (
            <div className="mt-2 text-xs text-blue-600">
              <p>Preview:</p>
              <pre className="mt-1 p-2 bg-gray-50 rounded text-xs whitespace-pre-wrap">{getFlagChangesDescription()}</pre>
            </div>
          )}
          
          {/* Existing review completion preview */}
          {!flagsChanged && initialFlags?.in_review && !newComment.trim() && (
            <div className="mt-2 text-xs text-green-600">
              <p>Preview: </p>
              <pre className="mt-1 p-2 bg-gray-50 rounded text-xs whitespace-pre-wrap">{'\n\n[✓ Review completed]'}</pre>
            </div>
          )}
        </form>
      )}
      
      {/* List of reviews */}
      <div className="space-y-4">
        {isFetchingReviews ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No reviews yet. {isReviewMode ? 'Be the first to review this project!' : ''}</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                <div className="flex items-start space-x-3">
                  {review.reviewer.image && (
                    <img
                      src={review.reviewer.image}
                      alt={review.reviewer.name || 'Reviewer'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h5 className="font-medium">{review.reviewer.name || review.reviewer.email}</h5>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{formatDate(review.createdAt)}</span>
                        
                        {/* Delete button - only visible in review mode and for the user's own reviews */}
                        {isReviewMode && isCurrentUserReviewer(review.reviewerId) && (
                          <>
                            {showDeleteConfirm === review.id ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDeleteReview(review.id)}
                                  className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
                                  disabled={isDeletingReview === review.id}
                                >
                                  {isDeletingReview === review.id ? 'Deleting...' : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(null)}
                                  className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400 transition-colors"
                                  disabled={isDeletingReview === review.id}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowDeleteConfirm(review.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete review"
                              >
                                <Icon glyph="delete" size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 