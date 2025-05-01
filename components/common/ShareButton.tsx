'use client';

import { useState, useContext } from 'react';
import { motion } from 'motion/react';
import Modal from './Modal';
import { ScrollProgressContext } from '../launch/Story';
import { useIsMobile } from '@/lib/hooks';

export default function ShareButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCopiedModal, setShowCopiedModal] = useState(false);
  const [scrollPercent] = useContext(ScrollProgressContext);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const isMobile = useIsMobile();

  // Adds a referral type to the URL - but only if one doesn't exist
  const addReferralTypeToUrl = (url: string, referralType?: string): string => {
    try {
      const urlObj = new URL(url);
      if (!urlObj.searchParams.has('t')) {
        if (referralType) {
          urlObj.searchParams.set('t', referralType);
        }
      }
      return urlObj.toString();
    } catch (e) {
      console.error('Invalid URL:', e);
      return url;
    }
  };

  // Only show the share button when we're at the RSVP page (scrollPercent === 1)
  if (scrollPercent < 0.9) return null;

  console.log('scrollPercent', scrollPercent)

  const shareOptions = [
    {
      name: 'X',
      icon: (
        <div className="bg-[#1DA1F2]/10 p-2 rounded-lg">
          <svg className="w-6 h-6 text-[#1DA1F2]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
      ),
      onClick: () => {
        const text = 'Join me at Shipwrecked, literally a high-school hackathon on an island! 🏝️ #hackathon #hackclub #code #programming #coding #shipwrecked';
        const shareUrl = addReferralTypeToUrl(currentUrl, 'sx');
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
        setIsOpen(false);
      }
    },
    ...(isMobile ? [{
      name: 'Instagram',
      icon: (
        <div className="bg-gradient-to-tr from-[#FCAF45] via-[#F77737] to-[#FD1D1D] p-2 rounded-lg">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        </div>
      ),
      onClick: () => {
        const shareUrl = addReferralTypeToUrl(currentUrl, 'si');
        navigator.clipboard.writeText("I just RSVPed for Shipwrecked, a once-in-a-lifetime hackathon on an island! 🏝️ " + shareUrl);
        setIsOpen(false);
        setShowCopiedModal(true);
      }
    }] : [])
  ];

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`fixed top-8 right-8 z-50 bg-transparent hover:bg-white/10 text-white font-medium py-2 px-4 rounded-lg transition-colors border border-white/20 backdrop-blur-sm ${isMobile ? 'top-[58px] right-[30px]' : ''}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Share
      </motion.button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Share Shipwrecked"
        okText="Close"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {shareOptions.map((option) => (
              <button
                key={option.name}
                onClick={option.onClick}
                className="w-full px-4 py-3 text-left text-lg font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-3"
              >
                {option.icon}
                Share on {option.name}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCopiedModal}
        onClose={() => setShowCopiedModal(false)}
        title="Share on Instagram"
        okText="Close"
      >
        <div className="flex flex-col gap-4">
          <p className="text-base text-gray-700">
            <p>1. FYI - the share post was copied to your clipboard!</p>
            <p>2. Tap the link below to open Instagram</p>
            <p>3. Tap the '+' icon to post a new Story</p>
            <p>4. Tap the 'Aa' (add text) button, and Ctrl/Cmd-V to paste!</p>
            <p>5. Post your story to help spread the word!</p>
          </p>
          <div className="flex flex-col gap-2">
            <a 
              href="https://www.instagram.com/create/story"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-4 py-3 text-left text-lg font-medium text-white bg-gradient-to-tr from-[#FCAF45] via-[#F77737] to-[#FD1D1D] rounded-lg transition-colors flex items-center gap-3 hover:opacity-90"
            >
              <div className="bg-white/10 p-2 rounded-lg">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
              Open Instagram
            </a>
          </div>
        </div>
      </Modal>
    </>
  );
} 