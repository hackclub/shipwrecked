'use client';

import { useReviewMode } from '@/app/contexts/ReviewModeContext';
import Icon from "@hackclub/icons";

interface ProjectMetadataWarningProps {
  projectID: string;
  isInReview: boolean;
  codeUrl?: string;
  playableUrl?: string;
  screenshot?: string;
  onEditProject: () => void;
}

export default function ProjectMetadataWarning({
  projectID,
  isInReview,
  codeUrl,
  playableUrl,
  screenshot,
  onEditProject
}: ProjectMetadataWarningProps) {
  const { isReviewMode } = useReviewMode();

  // Don't show this component in review mode or if project is already in review
  if (isReviewMode || isInReview) {
    return null;
  }

  // Check if all required metadata is present
  const hasCodeUrl = codeUrl && codeUrl.trim() !== '';
  const hasPlayableUrl = playableUrl && playableUrl.trim() !== '';
  const hasScreenshot = screenshot && screenshot.trim() !== '';
  
  // If all metadata is present, don't show the warning
  if (hasCodeUrl && hasPlayableUrl && hasScreenshot) {
    return null;
  }

  // Determine which fields are missing
  const missingFields = [];
  if (!hasCodeUrl) missingFields.push('Code URL');
  if (!hasPlayableUrl) missingFields.push('Playable URL');
  if (!hasScreenshot) missingFields.push('Screenshot URL');

  return (
    <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon glyph="important" size={20} className="text-amber-600 mt-0.5" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-bold text-amber-800 mb-2">
            Complete Your Project Before Submitting for Review
          </h3>
          <p className="text-sm text-amber-700 mb-3">
            Your project is missing some important information that reviewers need. 
            Please add the following before submitting for review:
          </p>
          <ul className="text-sm text-amber-700 mb-4 list-disc list-inside space-y-1">
            {missingFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
          <button
            onClick={onEditProject}
            className="w-full px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors flex items-center justify-center gap-2"
          >
            <Icon glyph="edit" size={16} />
            <span>Edit Project to Add Missing Information</span>
          </button>
        </div>
      </div>
    </div>
  );
} 