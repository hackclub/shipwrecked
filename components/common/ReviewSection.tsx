'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Icon from '@hackclub/icons';
import { useReviewMode } from '@/app/contexts/ReviewModeContext';

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
}

export default function ReviewSection({ projectID }: ReviewSectionProps) {
  const { data: session } = useSession();
  const { isReviewMode } = useReviewMode();
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingReviews, setIsFetchingReviews] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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

  // Submit a new review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectID,
          comment: newComment.trim(),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit review');
      }
      
      const newReview = await response.json();
      
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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Project Reviews</h3>
      
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
              placeholder="Share your thoughts about this project..."
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}
      
      {/* List of reviews */}
      <div className="space-y-4">
        <h4 className="text-md font-medium">Recent Reviews</h4>
        
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
              <div key={review.id} className="bg-gray-50 p-4 rounded-lg">
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