'use client';

import { useEffect, useRef } from 'react';
import styles from './Modal.module.css';
import { useIsMobile } from '@/lib/hooks';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  okText?: string;
  hideFooter?: boolean;
}

export default function Modal({ 
  isOpen, 
  onClose, 
  title = 'Information',
  children,
  okText = 'OK',
  hideFooter = false
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  
  const isMobile = useIsMobile();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      if (isMobile) document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (isMobile) document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Close if clicking outside modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent triggering parent element clicks
    e.stopPropagation();
    
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Safe close handler that stops event propagation
  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div 
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
      >
        <div className={`${styles.header} sticky top-0 z-10 bg-white`}>
          <span className='flex flex-row items-center'>
          <img src="/bottle.png" className="w-[60px] -rotate-45" />
          <h2 id="modal-title" className={styles.title}>{title}</h2>
          </span>
         <button 
            onClick={handleClose}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            <img className='w-[40px]' src="/mark-cross.svg" />
          </button>
        </div>
        <div className={`${styles.content} overflow-x-auto`} ref={contentRef}>
          {children}
        </div>
        {!hideFooter && (
          <div className={`${styles.footer} sticky bottom-0 z-10 bg-white`}>
            <button 
              onClick={handleClose}
              className={styles.okButton}
            >
              {okText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 