'use client';

import { useState } from 'react';
import Modal from '@/components/common/Modal';
import Tooltip from '../common/Tooltip';

export default function IDPopup() {
  const [isOpen, setIsOpen] = useState(true);

  const buildAuthorizeUrl = async () => {
    const response = await fetch('/api/identity/url');
    const data = await response.json();
    return data.url;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => null}
      title="Verify Your Identity"
      hideFooter={true}
      hideCloseButton
    >
      <div className="flex flex-col items-center justify-center p-2">
        {/* Illustration */}
        <div className="flex justify-center mb-4">
          <img src="/icon-error.svg" alt="Identity" className="w-16 h-16" />
        </div>
        <p className="text-gray-700 mb-4 text-center text-lg font-medium">
          Verify your identity to attend Shipwrecked!
        </p>
        <div className="mb-6 text-gray-500 text-sm text-center">
          <span className="font-semibold text-blue-600">Why verify?</span> It helps us keep Shipwrecked safe, fair, and fun for everyone.
        </div>
        <button
          onClick={async () => {
            const url = await buildAuthorizeUrl();
            window.open(url, '_blank');
          }}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-lg shadow-lg text-lg transition-all duration-150"
        >
          Verify My Identity
        </button>
      </div>
    </Modal>
  );
}