'use client';

import React, { ReactNode, useRef, useState, useEffect } from 'react';
import styles from '../../app/bay/tooltip.module.css';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'auto', className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'right' | 'bottom' | 'left'>('top');
  
  // Function to update tooltip position based on container position
  const updateTooltipPosition = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Default to top position
    let newPosition: 'top' | 'right' | 'bottom' | 'left' = 'top';
    let newStyle: React.CSSProperties = {};
    
    // If fixed position was specified, use it
    if (position !== 'auto') {
      newPosition = position as 'top' | 'right' | 'bottom' | 'left';
    } else {
      // Determine best position based on available space
      if (containerRect.bottom > viewportHeight - 100) {
        newPosition = 'top';
      } else if (containerRect.top < 100) {
        newPosition = 'bottom';
      } else if (containerRect.left < 150) {
        newPosition = 'right';
      } else if (containerRect.right > viewportWidth - 150) {
        newPosition = 'left';
      }
    }
    
    // Calculate positioning based on container's viewport position
    switch (newPosition) {
      case 'top':
        newStyle = {
          position: 'fixed',
          top: containerRect.top - 10,
          left: containerRect.left + containerRect.width / 2,
          transform: 'translate(-50%, -100%)',
          zIndex: 10000
        };
        break;
      case 'bottom':
        newStyle = {
          position: 'fixed',
          top: containerRect.bottom + 10,
          left: containerRect.left + containerRect.width / 2,
          transform: 'translate(-50%, 0)',
          zIndex: 10000
        };
        break;
      case 'left':
        newStyle = {
          position: 'fixed',
          top: containerRect.top + containerRect.height / 2,
          left: containerRect.left - 10,
          transform: 'translate(-100%, -50%)',
          zIndex: 10000
        };
        break;
      case 'right':
        newStyle = {
          position: 'fixed',
          top: containerRect.top + containerRect.height / 2,
          left: containerRect.right + 10,
          transform: 'translate(0, -50%)',
          zIndex: 10000
        };
        break;
    }
    
    setTooltipPosition(newPosition);
    setTooltipStyle(newStyle);
  };
  
  const handleMouseEnter = () => {
    setIsVisible(true);
    updateTooltipPosition();
  };
  
  const handleMouseLeave = () => {
    setIsVisible(false);
  };
  
  // Update position on scroll and resize
  useEffect(() => {
    if (isVisible) {
      updateTooltipPosition();
    }
    
    const handleScroll = () => {
      if (isVisible) {
        updateTooltipPosition();
      }
    };
    
    const handleResize = () => {
      if (isVisible) {
        updateTooltipPosition();
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [isVisible]);

  return (
    <>
      <span 
        className={`${styles.tooltipContainer} ${className}`} 
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>
      {isVisible && (
        <div 
          className={`${styles.tooltipContent} ${styles[tooltipPosition]}`}
          style={{
            ...tooltipStyle,
            visibility: 'visible',
            opacity: 1,
          }}
        >
          {content}
        </div>
      )}
    </>
  );
};

export default Tooltip; 