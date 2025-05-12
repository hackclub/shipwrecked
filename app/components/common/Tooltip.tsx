'use client';

import React, { ReactNode, useRef, useState, useEffect } from 'react';
import styles from '../../bay/tooltip.module.css';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'auto', className = '' }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'right' | 'bottom' | 'left'>('top');
  
  // Function to determine the best position for the tooltip
  const updateTooltipPosition = () => {
    if (!tooltipRef.current) return;
    
    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const scrollY = window.scrollY;
    
    // Default to top position
    let newPosition: 'top' | 'right' | 'bottom' | 'left' = 'top';
    
    // If fixed position was specified, use it
    if (position !== 'auto') {
      newPosition = position as 'top' | 'right' | 'bottom' | 'left';
    } else {
      // Near the bottom of the viewport, show above
      if (rect.bottom > viewportHeight - 100) {
        newPosition = 'top';
      } 
      // Near the top of the viewport, show below
      else if (rect.top < 100) {
        newPosition = 'bottom';
      }
      // Near the left edge, show to the right
      else if (rect.left < 100) {
        newPosition = 'right';
      }
      // Near the right edge, show to the left
      else if (rect.right > viewportWidth - 100) {
        newPosition = 'left';
      }
    }
    
    setTooltipPosition(newPosition);
  };
  
  // Update position on mount and window resize
  useEffect(() => {
    // Initial position update
    updateTooltipPosition();
    
    // Update on resize
    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition);
    
    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition);
    };
  }, []);

  return (
    <div className={`${styles.tooltipContainer} ${className}`} ref={tooltipRef}>
      {children}
      <div className={`${styles.tooltipContent} ${styles[tooltipPosition]}`}>
        {content}
      </div>
    </div>
  );
};

export default Tooltip; 