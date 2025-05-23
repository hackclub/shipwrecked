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
  result?: 'approve' | 'reject';
}

interface ReviewSectionProps {
  projectID: string;
  initialFlags?: ProjectFlags;
  onFlagsUpdated?: (updatedProject: any) => void;
  rawHours?: number;
  hackatimeLinks?: Array<{
    id: string;
    hackatimeName: string;
    rawHours: number;
    hoursOverride?: number | null;
  }>;
}

export default function ReviewSection({ 
  projectID, 
  initialFlags,
  onFlagsUpdated,
  rawHours,
  hackatimeLinks = []
}: ReviewSectionProps) {
  const { data: session } = useSession();
  const { isReviewMode } = useReviewMode();
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [reviewResult, setReviewResult] = useState<'approve' | 'reject' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingReviews, setIsFetchingReviews] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // State to track flag changes
  const [flagsChanged, setFlagsChanged] = useState(false);
  const [currentFlags, setCurrentFlags] = useState<ProjectFlags>({
    shipped: initialFlags?.shipped || false,
    viral: initialFlags?.viral || false,
    in_review: initialFlags?.in_review || false,
    hackatimeLinkOverrides: {}
  });
  const [originalFlags, setOriginalFlags] = useState<ProjectFlags>({
    shipped: initialFlags?.shipped || false,
    viral: initialFlags?.viral || false,
    in_review: initialFlags?.in_review || false,
    hackatimeLinkOverrides: {}
  });

  // Initialize flags just once when component mounts
  useEffect(() => {
    console.log('[DEBUG] ReviewSection initializing flags on mount');
    
    if (!initialFlags) return;
    
    // Create a new object for hackatimeLinkOverrides from hackatimeLinks
    const linkOverrides: Record<string, number | undefined> = {};
    
    // Fill it with existing values from hackatimeLinks
    if (hackatimeLinks && hackatimeLinks.length > 0) {
      hackatimeLinks.forEach(link => {
        linkOverrides[link.id] = link.hoursOverride === null ? undefined : link.hoursOverride;
      });
    }
    
    // Set initial flags once
    const baseFlags = {
      shipped: initialFlags.shipped,
      viral: initialFlags.viral,
      in_review: initialFlags.in_review,
    };
    
    // Set both state values with the same initial values
    setOriginalFlags({
      ...baseFlags,
      hackatimeLinkOverrides: {...linkOverrides}
    });
    
    setCurrentFlags({
      ...baseFlags,
      hackatimeLinkOverrides: {...linkOverrides}
    });
    
    // No changes initially
    setFlagsChanged(false);
  }, []); // Only run once on mount

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
    // Simply update the current flags state
    setCurrentFlags({
      shipped: flags.shipped,
      viral: flags.viral,
      in_review: flags.in_review,
      hackatimeLinkOverrides: flags.hackatimeLinkOverrides ? {...flags.hackatimeLinkOverrides} : {}
    });
    
    // Check if any flags have changed
    const hasShippedChanged = flags.shipped !== originalFlags.shipped;
    const hasViralChanged = flags.viral !== originalFlags.viral;
    const hasInReviewChanged = flags.in_review !== originalFlags.in_review;
    
    // Check if any hours have changed
    const origOverrides = originalFlags.hackatimeLinkOverrides || {};
    const newOverrides = flags.hackatimeLinkOverrides || {};
    
    let hasHourChanges = false;
    const allKeys = new Set([...Object.keys(origOverrides), ...Object.keys(newOverrides)]);
    
    for (const key of allKeys) {
      if (origOverrides[key] !== newOverrides[key]) {
        hasHourChanges = true;
        break;
      }
    }
    
    const hasAnyChanges = hasShippedChanged || hasViralChanged || hasInReviewChanged || hasHourChanges;
    
    // Update flagsChanged based on any changes
    setFlagsChanged(hasAnyChanges);
    
    // Call onFlagsUpdated if there are changes and a callback exists
    if (hasAnyChanges && onFlagsUpdated) {
      onFlagsUpdated(flags);
    }
  };
  
  // Helper to check if two override objects are equal
  const isOverridesEqual = (
    overrides1: Record<string, number | undefined> | undefined,
    overrides2: Record<string, number | undefined> | undefined
  ): boolean => {
    // If both are undefined/null, they're equal
    if (!overrides1 && !overrides2) return true;
    // If one is undefined/null but the other isn't, they're different
    if (!overrides1 || !overrides2) return false;
    
    // Check if keys match
    const keys1 = Object.keys(overrides1);
    const keys2 = Object.keys(overrides2);
    
    if (keys1.length !== keys2.length) return false;
    
    // Check if values match
    for (const key of keys1) {
      const val1 = overrides1[key];
      const val2 = overrides2[key];
      
      // Handle undefined/null equality - treat both as equivalent "no value"
      if ((val1 === undefined || val1 === null) && 
          (val2 === undefined || val2 === null)) {
        continue;
      }
      
      // Handle numeric comparison with small epsilon for floating point precision
      if (typeof val1 === 'number' && typeof val2 === 'number') {
        if (Math.abs(val1 - val2) > 0.001) {
          return false;
        }
        continue;
      }
      
      // Strict equality for other cases
      if (val1 !== val2) {
        return false;
      }
    }
    
    return true;
  };

  // Generate a description of flag changes for the review comment
  const getFlagChangesDescription = (): string => {
    const changes: string[] = [];
    
    console.log('[DEBUG] getFlagChangesDescription comparing flags:', {
      original: originalFlags,
      current: currentFlags
    });
    
    // Always check flag changes regardless of the flagsChanged state
    if (currentFlags.shipped !== originalFlags.shipped) {
      changes.push(`Shipped: ${originalFlags.shipped ? 'Yes' : 'No'} → ${currentFlags.shipped ? 'Yes' : 'No'}`);
    }
    
    if (currentFlags.viral !== originalFlags.viral) {
      console.log('[DEBUG] Viral flag change detected:', {
        original: originalFlags.viral,
        current: currentFlags.viral
      });
      changes.push(`Viral: ${originalFlags.viral ? 'Yes' : 'No'} → ${currentFlags.viral ? 'Yes' : 'No'}`);
    }
    
    // Check for changes in Hackatime link overrides
    const originalOverrides = originalFlags.hackatimeLinkOverrides || {};
    const currentOverrides = currentFlags.hackatimeLinkOverrides || {};
    
    const linkChanges: string[] = [];
    
    // Force check all hackatime links for any differences
    hackatimeLinks.forEach(link => {
      // Handle null, undefined, or absent values consistently
      const getNumberValue = (obj: Record<string, any>, key: string): number | undefined => {
        const value = obj[key];
        // Treat null and undefined the same way - as undefined (no override)
        if (value === null || value === undefined) return undefined;
        // Ensure we're working with numbers
        return typeof value === 'number' ? value : undefined;
      };
      
      const originalValue = getNumberValue(originalOverrides, link.id);
      const currentValue = getNumberValue(currentOverrides, link.id);
      
      console.log(`[DEBUG] Comparing hours for ${link.hackatimeName}:`, {
        original: originalValue,
        current: currentValue,
        equal: originalValue === currentValue
      });
      
      // IMPORTANT: Force comparison of numerical values carefully
      const isValueDifferent = (() => {
        // If both are undefined/null, they're equal
        if (originalValue === undefined && currentValue === undefined) return false;
        // If one is undefined/null but the other isn't, they're different
        if (originalValue === undefined || currentValue === undefined) return true;
        // Compare the actual numerical values with small epsilon for floating point precision
        return Math.abs(originalValue - currentValue) > 0.001;
      })();
      
      if (isValueDifferent) {
        // Format the hours values with proper units for display
        const originalDisplay = originalValue !== undefined ? `${originalValue}h` : 'none';
        const currentDisplay = currentValue !== undefined ? `${currentValue}h` : 'none';
        
        console.log(`[DEBUG] Found override change: ${link.hackatimeName}: ${originalDisplay} → ${currentDisplay}`);
        linkChanges.push(`${link.hackatimeName}: ${originalDisplay} → ${currentDisplay}`);
      }
    });
    
    if (linkChanges.length > 0) {
      console.log(`[DEBUG] Found ${linkChanges.length} link changes:`, linkChanges);
      if (linkChanges.length === 1) {
        changes.push(`Hours Approved: ${linkChanges[0]}`);
      } else {
        // For multiple link changes, use a more structured format
        changes.push(`Hours Approved:\n` + 
          linkChanges.map(change => `  • ${change}`).join('\n')
        );
      }
    }
    
    if (currentFlags.in_review !== originalFlags.in_review) {
      changes.push(`In Review: ${originalFlags.in_review ? 'Yes' : 'No'} → ${currentFlags.in_review ? 'Yes' : 'No'}`);
    }
    
    // Add "Review completed" indicator if the project was in review
    const reviewCompleted = originalFlags.in_review && !currentFlags.in_review;
    
    console.log(`[DEBUG] Changes:`, {
      changesCount: changes.length,
      reviewCompleted,
      changes
    });
    
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
    
    // Validate that a result is selected
    if (!reviewResult) {
      toast.error('Please select a review result');
      return;
    }
    
    // Validate that rejections have a comment
    if (reviewResult === 'reject' && !newComment.trim()) {
      toast.error('Please provide a comment explaining the rejection reason');
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
        updatedFlags.in_review !== originalFlags.in_review;
      
      // Deep compare hackatimeLinkOverrides
      const updatedOverrides = updatedFlags.hackatimeLinkOverrides || {};
      const originalOverrides = originalFlags.hackatimeLinkOverrides || {};
      const allKeys = new Set([
        ...Object.keys(updatedOverrides),
        ...Object.keys(originalOverrides)
      ]);
      
      const hasOverrideChanges = Array.from(allKeys).some(key => {
        const original = originalOverrides[key] === null ? undefined : originalOverrides[key];
        const updated = updatedOverrides[key] === null ? undefined : updatedOverrides[key];
        return original !== updated;
      });
      
      const hasAnyChanges = hasChanges || hasOverrideChanges;
      
      // Update current flags and mark as changed
      setCurrentFlags(updatedFlags);
      setFlagsChanged(hasAnyChanges || wasInReview);
      
      // Update flags if they've changed or if review is completed
      if (hasAnyChanges || wasInReview) {
        // Make sure we're explicitly including the hackatimeLinkOverrides
        // even if they're empty or unchanged, to ensure they're processed by the API
        const requestBody = {
          projectID,
          shipped: updatedFlags.shipped,
          viral: updatedFlags.viral,
          in_review: updatedFlags.in_review,
          hackatimeLinkOverrides: updatedFlags.hackatimeLinkOverrides || {}
        };
        
        console.log('Sending review update with payload:', requestBody);
        
        const flagsResponse = await fetch('/api/projects/flags', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
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
      
      // Then submit the review with result and flag changes noted in the comment
      const resultPrefix = reviewResult === 'approve' ? '✅ Approved' : '❌ Rejected';
      const commentContent = newComment.trim() ? `\n${newComment.trim()}` : '';
      const flagChanges = getFlagChangesDescription();
      const reviewCompleted = !flagChanges && wasInReview ? '\n\n[✓ Review completed]' : '';
      
      const finalComment = `${resultPrefix}${commentContent}${flagChanges}${reviewCompleted}`;
      
      const reviewResponse = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectID,
          comment: finalComment,
          result: reviewResult, // Include for email notifications
        }),
      });
      
      if (!reviewResponse.ok) {
        throw new Error('Failed to submit review');
      }
      
      const newReview = await reviewResponse.json();
      
      // Add the new review to the top of the list
      setReviews([newReview, ...reviews]);
      setNewComment('');
      setReviewResult(null); // Reset result
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
    <div className="space-y-6 bg-white p-4 sm:p-6 rounded-lg mb-12 w-full max-w-full">
      <h3 className="text-lg font-semibold border-b pb-2">Project Reviews</h3>
      
      {/* Project Flags Editor */}
      {isReviewMode && initialFlags && (
        <div className="mb-6">
          <ProjectFlagsEditor
            projectID={projectID}
            initialShipped={currentFlags.shipped}
            initialViral={currentFlags.viral}
            initialInReview={currentFlags.in_review}
            hackatimeLinks={hackatimeLinks}
            onChange={handleFlagsChange}
          />
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
            <p>Add a review comment and click <strong>Submit Review</strong> below to save these changes.</p>
          </div>
        </div>
      )}
      
      {/* Add new review form - only visible in review mode */}
      {isReviewMode && (
        <form onSubmit={handleSubmitReview} className="mb-6">
          {/* Review Result Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Result*
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setReviewResult('approve')}
                className={`flex-1 px-4 py-2 rounded-md border transition-colors flex items-center justify-center gap-2 ${
                  reviewResult === 'approve'
                    ? 'bg-green-50 border-green-500 text-green-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon glyph="checkmark" size={16} className={reviewResult === 'approve' ? 'text-green-600' : 'text-gray-500'} />
                <span>Approve</span>
              </button>
              <button
                type="button"
                onClick={() => setReviewResult('reject')}
                className={`flex-1 px-4 py-2 rounded-md border transition-colors flex items-center justify-center gap-2 ${
                  reviewResult === 'reject'
                    ? 'bg-red-50 border-red-500 text-red-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon glyph="important" size={16} className={reviewResult === 'reject' ? 'text-red-600' : 'text-gray-500'} />
                <span>Reject</span>
              </button>
            </div>
            {reviewResult === 'reject' && (
              <p className="mt-1 text-xs text-red-600">A comment explaining the rejection reason is required.</p>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
              {reviewResult === 'reject' ? 'Comment* (required)' : 'Comment (optional)'}
            </label>
            <textarea
              id="comment"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                reviewResult === 'reject' && !newComment.trim()
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder={reviewResult === 'reject' 
                ? "Please explain why this project is being rejected and what changes are needed"
                : "Add any comments about your approval (optional)"}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !reviewResult || (reviewResult === 'reject' && !newComment.trim())}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Submitting...' : (flagsChanged ? 'Submit Review with Flag Changes' : 'Submit Review')}
          </button>
          
          {/* Preview */}
          <div className="mt-2 text-xs text-blue-600">
            <p>Preview:</p>
            <pre className="mt-1 p-2 bg-gray-50 rounded text-xs whitespace-pre-wrap">
              {reviewResult === 'approve' ? '✅ Approved' : reviewResult === 'reject' ? '❌ Rejected' : ''}
              {newComment.trim() ? '\n' + newComment.trim() : ''}
              
              {/* Direct simple comparison of flags */}
              {(() => {
                // Track changes
                const changes: string[] = [];
                
                // Check for basic flag changes
                if (currentFlags.shipped !== originalFlags.shipped) {
                  changes.push(`Shipped: ${originalFlags.shipped ? 'Yes' : 'No'} → ${currentFlags.shipped ? 'Yes' : 'No'}`);
                }
                
                if (currentFlags.viral !== originalFlags.viral) {
                  changes.push(`Viral: ${originalFlags.viral ? 'Yes' : 'No'} → ${currentFlags.viral ? 'Yes' : 'No'}`);
                }
                
                if (currentFlags.in_review !== originalFlags.in_review) {
                  changes.push(`In Review: ${originalFlags.in_review ? 'Yes' : 'No'} → ${currentFlags.in_review ? 'Yes' : 'No'}`);
                }
                
                // Check hour changes
                const origOverrides = originalFlags.hackatimeLinkOverrides || {};
                const currOverrides = currentFlags.hackatimeLinkOverrides || {};
                
                const hourChanges: string[] = [];
                
                // Simple comparison of each link's hours
                hackatimeLinks.forEach(link => {
                  const origValue = origOverrides[link.id];
                  const currValue = currOverrides[link.id];
                  
                  if (origValue !== currValue) {
                    hourChanges.push(`${link.hackatimeName}: ${origValue !== undefined ? origValue + 'h' : 'none'} → ${currValue !== undefined ? currValue + 'h' : 'none'}`);
                  }
                });
                
                // Add hour changes
                if (hourChanges.length === 1) {
                  changes.push(`Hours Approved: ${hourChanges[0]}`);
                } else if (hourChanges.length > 1) {
                  changes.push(`Hours Approved:\n` + hourChanges.map(c => `  • ${c}`).join('\n'));
                }
                
                // Return formatted changes or review completed message
                if (changes.length > 0) {
                  return `\n\n[Status changes: ${changes.join(', ')}]`;
                } else if (originalFlags.in_review) {
                  return '\n\n[✓ Review completed]';
                } else {
                  return '';
                }
              })()}
            </pre>
          </div>
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
                      <div className="flex items-center">
                        <h5 className="font-medium">{review.reviewer.name || review.reviewer.email}</h5>
                        {review.result && (
                          <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                            review.result === 'approve' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {review.result === 'approve' ? 'Approved' : 'Rejected'}
                          </span>
                        )}
                      </div>
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