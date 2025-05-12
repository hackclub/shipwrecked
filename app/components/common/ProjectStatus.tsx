import React from 'react';

interface ProjectStatusProps {
  viral: boolean;
  shipped: boolean;
  className?: string;
}

export default function ProjectStatus({ viral, shipped, className = '' }: ProjectStatusProps) {
  return (
    <div className={`flex justify-center mt-2 ${className}`}>
      <div className="grid grid-cols-2 gap-x-6 w-48">
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