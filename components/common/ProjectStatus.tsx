import React from 'react';

interface ProjectStatusProps {
  viral: boolean;
  shipped: boolean;
  in_review?: boolean;
  className?: string;
  hideViral?: boolean;
}

export default function ProjectStatus({ viral, shipped, in_review = false, className = '', hideViral = false }: ProjectStatusProps) {
  return (
    <div className={`flex justify-center mt-2 ${className}`}>
      <div className={`grid gap-x-3 min-w-[200px] ${hideViral ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {!hideViral && (
          <div className="text-xs text-gray-500 flex items-center justify-center">
            <span className="mr-1">{viral ? '✅' : '❌'}</span>
            <span>Viral</span>
          </div>
        )}
        <div className="text-xs text-gray-500 flex items-center justify-center">
          <span className="mr-1">{shipped ? '✅' : '❌'}</span>
          <span>Shipped</span>
        </div>
      </div>
    </div>
  );
} 