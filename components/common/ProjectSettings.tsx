'use client';

import { useState } from 'react';
import Icon from '@hackclub/icons';

interface ProjectSettingsProps {
  projectID: string;
  initialChatEnabled: boolean;
  onChatEnabledChange: (enabled: boolean) => void;
  isOwner: boolean;
}

export default function ProjectSettings({
  projectID,
  initialChatEnabled,
  onChatEnabledChange,
  isOwner
}: ProjectSettingsProps) {
  const [chatEnabled, setChatEnabled] = useState(initialChatEnabled);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChatToggle = async () => {
    if (!isOwner || isUpdating) return;
    
    setIsUpdating(true);
    const newValue = !chatEnabled;
    
    try {
      const response = await fetch(`/api/projects/${projectID}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_enabled: newValue
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update chat setting');
      }

      setChatEnabled(newValue);
      onChatEnabledChange(newValue);
    } catch (error) {
      console.error('Error updating chat setting:', error);
      // You might want to show a toast notification here
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon glyph="settings" size={20} />
        Project Settings
      </h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">
              Enable Chat Discussion
            </h4>
            <p className="text-sm text-gray-500 mt-1">
              Allow visitors to discuss your project in real-time. A "Discuss..." button will appear in the gallery.
            </p>
          </div>
          <div className="ml-4">
            <button
              onClick={handleChatToggle}
              disabled={isUpdating}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                chatEnabled 
                  ? 'bg-blue-600' 
                  : 'bg-gray-200'
              } ${
                isUpdating 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  chatEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        
        {chatEnabled && (
          <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
            <p className="flex items-center gap-2">
              <Icon glyph="info" size={16} />
              Chat is now enabled for this project. Visitors can click "Discuss..." in the gallery to join the conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 