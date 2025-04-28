'use client';

import { useEffect, useRef } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  okText?: string;
}

export default function Modal({ 
  isOpen, 
  onClose, 
  title = 'Information',
  children,
  okText = 'OK'
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Close if clicking outside modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
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
        <div className={styles.header}>
          <span className='flex flex-row items-center'>
          <img src="/bottle.png" className="w-[60px] -rotate-45" />
          <h2 id="modal-title" className={styles.title}>{title}</h2>
          </span>
         <button 
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            <img className='w-[40px]' src="/mark-cross.svg" />
          </button>
        </div>
        <div className={styles.content}>
          {children}
        </div>
        <div className={styles.footer}>
          <button 
            onClick={onClose}
            className={styles.okButton}
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
} 