'use client';

import { useState } from 'react';

interface ReviewChecklistProps {
  onChecklistComplete: (justification: string) => void;
  isSubmitting: boolean;
}

export default function ReviewChecklist({ onChecklistComplete, isSubmitting }: ReviewChecklistProps) {
  const [checklistItems, setChecklistItems] = useState({
    canReplicate: false,
    playLinkNotVideo: false,
    projectWorks: false,
    validReadme: false,
    screenshotRendering: false,
    validPlayUrlAndGithub: false,
    verifiedHackatimeHistory: false,
    sampledGitHubCommits: false,
    hackatimeHoursAddUp: false,
    certifiedAsShipped: false
  });
  
  const [justification, setJustification] = useState('');

  const allItemsChecked = Object.values(checklistItems).every(item => item);

  const handleChecklistChange = (item: keyof typeof checklistItems) => {
    setChecklistItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (allItemsChecked && justification.trim()) {
      onChecklistComplete(justification.trim());
    }
  };

  return (
    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 mb-4">
      <h3 className="text-sm font-bold text-blue-800 mb-3">Review Checklist</h3>
      <p className="text-sm text-blue-700 mb-4">
        Please complete all checklist items before approving this review.
      </p>
      
      <form onSubmit={handleSubmit}>
        {/* Ship Check Section */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Ship check:</h4>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={checklistItems.canReplicate}
                onChange={() => handleChecklistChange('canReplicate')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">I can replicate this project on my computer</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={checklistItems.playLinkNotVideo}
                onChange={() => handleChecklistChange('playLinkNotVideo')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">Play link is not a video. If it is, I've made sure that it is acceptable in this circumstance.</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={checklistItems.projectWorks}
                onChange={() => handleChecklistChange('projectWorks')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">Project works as intended</span>
            </label>
          </div>
        </div>

        {/* Housekeeping Section */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Housekeeping:</h4>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={checklistItems.validReadme}
                onChange={() => handleChecklistChange('validReadme')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">Valid readme</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={checklistItems.screenshotRendering}
                onChange={() => handleChecklistChange('screenshotRendering')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">Screenshot rendering</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={checklistItems.validPlayUrlAndGithub}
                onChange={() => handleChecklistChange('validPlayUrlAndGithub')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">Valid Play URL and public GitHub</span>
            </label>
          </div>
        </div>

        {/* Hour Review Section */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Hour review:</h4>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={checklistItems.verifiedHackatimeHistory}
                onChange={() => handleChecklistChange('verifiedHackatimeHistory')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">Verified hackatime history</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={checklistItems.sampledGitHubCommits}
                onChange={() => handleChecklistChange('sampledGitHubCommits')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">Sampled at least 3 GitHub commits</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={checklistItems.hackatimeHoursAddUp}
                onChange={() => handleChecklistChange('hackatimeHoursAddUp')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">Hackatime hours add up to project quality</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={checklistItems.certifiedAsShipped}
                onChange={() => handleChecklistChange('certifiedAsShipped')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">Certified as shipped</span>
            </label>
          </div>
        </div>

        {/* Justification Field */}
        <div className="mb-4">
          <label htmlFor="justification" className="block text-sm font-medium text-gray-700 mb-1">
            Justification for approved hours? Explain why you find the approved hours justified.
          </label>
          <textarea
            id="justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Please explain your justification for the approved hours..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
            required
          />
        </div>

        <button
          type="submit"
          disabled={!allItemsChecked || !justification.trim() || isSubmitting}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Processing...' : 'Complete Checklist'}
        </button>
      </form>
    </div>
  );
} 