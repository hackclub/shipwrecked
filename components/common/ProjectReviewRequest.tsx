'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useReviewMode } from '@/app/contexts/ReviewModeContext';
import ProjectMetadataWarning from './ProjectMetadataWarning';

// Define review request types
export type ReviewRequestType = 'ShippedApproval' | 'ViralApproval' | 'HoursApproval' | 'Other';

interface ProjectReviewRequestProps {
  projectID: string;
  isInReview: boolean;
  isShipped?: boolean; // Add shipped status prop
  isViral?: boolean; // Add viral status prop
  codeUrl?: string; // Add codeUrl prop
  playableUrl?: string; // Add playableUrl prop
  screenshot?: string; // Add screenshot prop
  onRequestSubmitted: (updatedProject: any, review: any) => void;
  onEditProject: () => void; // Add callback to open project editor
}

export default function ProjectReviewRequest({
  projectID,
  isInReview,
  isShipped = false, // Default to false if not provided
  isViral = false, // Default to false if not provided
  codeUrl,
  playableUrl,
  screenshot,
  onRequestSubmitted,
  onEditProject
}: ProjectReviewRequestProps) {
  const { isReviewMode } = useReviewMode();
  const [comment, setComment] = useState('');
  const [reviewType, setReviewType] = useState<ReviewRequestType>(isShipped ? 'HoursApproval' : 'ShippedApproval');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Checklist state
  const [checklist, setChecklist] = useState({
    codeComplete: false,
    easyToRun: false,
    experienceableBuild: false,
    wellDocumented: false,
    polished: false
  });

  // Effect to update default reviewType when isShipped or isViral changes
  useEffect(() => {
    // If project is already shipped, default to HoursApproval
    // Otherwise default to ShippedApproval
    setReviewType(isShipped ? 'HoursApproval' : 'ShippedApproval');
  }, [isShipped]);

  // Don't show this component in review mode or if project is already in review
  if (isReviewMode || isInReview) {
    return null;
  }

  // Check if all required metadata is present
  const hasCodeUrl = codeUrl && codeUrl.trim() !== '';
  const hasPlayableUrl = playableUrl && playableUrl.trim() !== '';
  const hasScreenshot = screenshot && screenshot.trim() !== '';
  const hasAllRequiredMetadata = hasCodeUrl && hasPlayableUrl && hasScreenshot;

  // If metadata is missing, show the warning component instead
  if (!hasAllRequiredMetadata) {
    return (
      <ProjectMetadataWarning
        projectID={projectID}
        isInReview={isInReview}
        codeUrl={codeUrl}
        playableUrl={playableUrl}
        screenshot={screenshot}
        onEditProject={onEditProject}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      toast.error('Please specify what you need reviewed');
      return;
    }

    // Check if all checklist items are completed
    const allChecklistComplete = Object.values(checklist).every(checked => checked);
    if (!allChecklistComplete) {
      toast.error('Please complete all checklist items before submitting');
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
      // Reset checklist
      setChecklist({
        codeComplete: false,
        easyToRun: false,
        experienceableBuild: false,
        wellDocumented: false,
        polished: false
      });
      
      // Notify parent component
      onRequestSubmitted(data.project, data.review);
    } catch (error) {
      console.error('Error submitting project for review:', error);
      toast.error('Failed to submit project for review');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to handle checklist changes
  const handleChecklistChange = (key: keyof typeof checklist) => {
    setChecklist(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Check if all checklist items are completed
  const allChecklistComplete = Object.values(checklist).every(checked => checked);

  // Helper text based on selected review type
  const getPlaceholderText = () => {
    switch (reviewType) {
      case 'ShippedApproval':
        return "Explain why this project should be approved as 'shipped'. Include any relevant details about deployment and functionality.";
      case 'ViralApproval':
        return "Explain why this project should be considered 'viral'. Include links to social media that prove you have met one of the requirements on shipwrecked.hackclub.com/info/go-viral (if doing hacker news, link archive.org snapshot)";
      case 'HoursApproval':
        return "Provide details about the updates you've made to this project since it was approved as shipped. (ex. I implemented feature X, Y, & Z.) Please keep it short & use bullets for readability.";
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
            {!isShipped && (
              <option value="ShippedApproval">I want this project approved as shipped</option>
            )}
            {!isViral && (
              <option value="ViralApproval">I want this project approved as viral</option>
            )}
            {isShipped && (
              <option value="HoursApproval">I want to ship an update to this project</option>
            )}
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

        {/* Pre-submission Checklist */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pre-submission Checklist*
          </label>
          <div className="space-y-2 bg-white p-3 rounded border border-gray-200">
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="codeComplete"
                checked={checklist.codeComplete}
                onChange={() => handleChecklistChange('codeComplete')}
                className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <label htmlFor="codeComplete" className="text-sm text-gray-700">
                ✅ Code is complete and functional — Project runs as described after setup, with all core features working (e.g., login flow, interactivity).
              </label>
            </div>
            
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="easyToRun"
                checked={checklist.easyToRun}
                onChange={() => handleChecklistChange('easyToRun')}
                className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <label htmlFor="easyToRun" className="text-sm text-gray-700">
                📦 Easy to run locally — Clear, working setup instructions (&lt;2 min) with no need for guessing or extra troubleshooting beyond documented steps in the readme.
              </label>
            </div>
            
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="experienceableBuild"
                checked={checklist.experienceableBuild}
                onChange={() => handleChecklistChange('experienceableBuild')}
                className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <label htmlFor="experienceableBuild" className="text-sm text-gray-700">
              🌐 Experienceable build — Live site, working APK/App Store link for iOS (if it's not on the App Store, please check out <a href="http://shipwrecked.hackclub.com/AltStore.md" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">this guide</a>), or if any other runnable builds exist (videos alone are not acceptable unless explicitly approved).
              </label>
            </div>
            
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="wellDocumented"
                checked={checklist.wellDocumented}
                onChange={() => handleChecklistChange('wellDocumented')}
                className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <label htmlFor="wellDocumented" className="text-sm text-gray-700">
                📄 Well-documented — README clearly explains what the project does, how to run it, and includes working screenshots and links.
              </label>
            </div>
            
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="polished"
                checked={checklist.polished}
                onChange={() => handleChecklistChange('polished')}
                className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <label htmlFor="polished" className="text-sm text-gray-700">
                🧹 Polished and presentable — No major bugs or visual issues; looks intentional and ready for others to experience.
              </label>
            </div>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting || !comment.trim() || !allChecklistComplete}
          className="w-full px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit for Review'}
        </button>
      </form>
    </div>
  );
} 