import React from 'react';

interface ProjectStatusProps {
  viral: boolean;
  shipped: boolean;
  in_review?: boolean;
  className?: string;
}

export default function ProjectStatus({ viral, shipped, in_review = false, className = '' }: ProjectStatusProps) {
  return (
    <div className={`flex justify-center mt-2 ${className}`}>
      <div className="grid grid-cols-2 gap-x-3 min-w-[200px]">
        <div className="text-xs text-gray-500 flex items-center justify-center">
          <span className="mr-1">{viral ? '✅' : '❌'}</span>
          <span>Viral</span>
        </div>
        <div className="text-xs text-gray-500 flex items-center justify-center">
          <span className="mr-1">{shipped ? '✅' : '❌'}</span>
          <span>Shipped</span>
        </div>
      </div>
    </div>
  );
} 