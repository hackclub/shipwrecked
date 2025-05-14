'use client';

import { useReviewMode } from '@/app/contexts/ReviewModeContext';
import Icon from '@hackclub/icons';

export default function ReviewModeToggle() {
  const { isReviewMode, toggleReviewMode } = useReviewMode();

  return (
    <button
      onClick={toggleReviewMode}
      className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
        isReviewMode
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      title={isReviewMode ? 'Exit review mode' : 'Enter review mode'}
    >
      <Icon glyph={isReviewMode ? 'view' : 'edit'} size={16} />
      <span>{isReviewMode ? 'Exit Review Mode' : 'Enter Review Mode'}</span>
    </button>
  );
} 