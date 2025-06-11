'use client';

import { getUserCategoryStyle } from '@/hooks/useUserClustering';

interface UserCategoryDisplayProps {
  category?: {
    category: 'whale' | 'shipper' | 'newbie';
    description: string;
  } | null;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function UserCategoryDisplay({
  category,
  size = 'medium',
  className = ''
}: UserCategoryDisplayProps) {
  if (!category) {
    return (
      <span className={`text-xs text-gray-400 ${className}`}>
        No data
      </span>
    );
  }

  const style = getUserCategoryStyle(category.category);
  
  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-1',
    large: 'text-base px-4 py-2'
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${style.color} ${style.bgColor} ${style.borderColor}
        border ${sizeClasses[size]} ${className}
      `}
      title={`${style.description}: ${category.description}`}
    >
      <span className="text-xs">{style.emoji}</span>
      <span>{style.label}</span>
    </span>
  );
} 