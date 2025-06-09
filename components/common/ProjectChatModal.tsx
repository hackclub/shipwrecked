'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Icon from '@hackclub/icons';

interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
}

interface Project {
  projectID: string;
  name: string;
  description: string;
  chat_enabled: boolean;
}

interface ProjectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function ProjectChatModal({ isOpen, onClose, project, showToast }: ProjectChatModalProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimestampRef = useRef<string>('');

  // Polling function to fetch new messages
  const pollMessages = async (isInitialLoad = false) => {
    if (!project.chat_enabled) return;
    
    try {
      // Build the URL with optional since parameter
      let url = `/api/projects/${project.projectID}/chat/messages`;
      if (!isInitialLoad && lastMessageTimestampRef.current) {
        url += `?since=${encodeURIComponent(lastMessageTimestampRef.current)}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data: ChatMessage[] = await response.json();
        
        if (isInitialLoad) {
          // Initial load - replace all messages
          setMessages(data);
          if (data.length > 0) {
            lastMessageTimestampRef.current = data[data.length - 1]?.createdAt || '';
          }
        } else {
          // Polling update - append new messages
          if (data.length > 0) {
            setMessages(prev => [...prev, ...data]);
            lastMessageTimestampRef.current = data[data.length - 1]?.createdAt || '';
          }
        }
      }
    } catch (error) {
      console.error('Error polling messages:', error);
    }
  };

  // Initialize polling when modal opens
  useEffect(() => {
    if (!isOpen || !project.chat_enabled) {
      // Clear polling when modal closes
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Initial load
    const loadMessages = async () => {
      setIsLoading(true);
      await pollMessages(true); // Pass true for initial load
      setIsLoading(false);
    };

    loadMessages();

    // Start polling every 5 seconds
    pollingIntervalRef.current = setInterval(() => pollMessages(false), 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isOpen, project.projectID, project.chat_enabled]);

  // Scroll to bottom when new messages arrive (immediate, not animated)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  // Immediately scroll to bottom when modal opens and messages are loaded
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [isLoading, messages.length]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Focus input field when modal opens
  useEffect(() => {
    if (isOpen && messageInputRef.current) {
      // Small delay to ensure the modal is fully rendered
      const timeoutId = setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !session?.user || isSending) return;

    // Client-side validation for message length
    if (newMessage.trim().length > 1000) {
      showToast && showToast('Message too long. Maximum 1000 characters allowed.', 'error');
      return;
    }

    setIsSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // Send to server to save in database
      const response = await fetch(`/api/projects/${project.projectID}/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent
        })
      });

      if (response.ok) {
        const savedMessage = await response.json();
        
        // Add to local state immediately for instant feedback
        setMessages(prev => [...prev, savedMessage]);
        lastMessageTimestampRef.current = savedMessage.createdAt;

        // Re-focus the input field for continued chatting
        setTimeout(() => {
          messageInputRef.current?.focus();
        }, 50);

        // Trigger immediate poll to sync with server state
        setTimeout(() => pollMessages(false), 100);
      } else if (response.status === 429) {
        // Rate limited - show friendly message
        const errorData = await response.json();
        console.log('Rate limited:', errorData);
        // Restore the message in the input and show a toast or inline message
        setNewMessage(messageContent);
        showToast && showToast('Please wait a moment before sending another message (max 1 message every 5 seconds)', 'info');
      } else {
        // Other error
        const errorData = await response.json();
        console.error('Error sending message:', errorData);
        setNewMessage(messageContent);
        showToast && showToast(errorData.error || 'Failed to send message. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore the message in the input if sending failed
      setNewMessage(messageContent);
      showToast && showToast('Failed to send message. Please try again.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Generate obfuscated username based on userid
  const obfuscateUsername = (userId: string) => {
    // Create a simple hash to generate consistent animal names
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const animals = [
      'Fox', 'Wolf', 'Bear', 'Eagle', 'Shark', 'Tiger', 'Lion', 'Panda',
      'Owl', 'Hawk', 'Raven', 'Falcon', 'Lynx', 'Otter', 'Seal', 'Whale',
      'Dolphin', 'Penguin', 'Koala', 'Sloth', 'Gecko', 'Viper', 'Cobra',
      'Phoenix', 'Dragon', 'Unicorn', 'Griffin', 'Kraken', 'Hydra', 'Sphinx'
    ];
    
    const adjectives = [
      'Swift', 'Bold', 'Wise', 'Calm', 'Wild', 'Brave', 'Cool', 'Sharp',
      'Quick', 'Zen', 'Fire', 'Ice', 'Storm', 'Night', 'Dawn', 'Void',
      'Neon', 'Cyber', 'Nova', 'Stealth', 'Shadow', 'Light', 'Dark', 'Mystic'
    ];
    
    const animalIndex = Math.abs(hash) % animals.length;
    const adjIndex = Math.abs(hash >> 8) % adjectives.length;
    
    return `${adjectives[adjIndex]}${animals[animalIndex]}`;
  };

  // Generate color based on userid hash
  const getUserColor = (userId: string) => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    
    // Generate colors that are readable on white background
    const colors = [
      '#dc2626', // red-600
      '#ea580c', // orange-600  
      '#d97706', // amber-600
      '#65a30d', // lime-600
      '#059669', // emerald-600
      '#0891b2', // cyan-600
      '#2563eb', // blue-600
      '#7c3aed', // violet-600
      '#c026d3', // fuchsia-600
      '#e11d48', // rose-600
      '#7c2d12', // orange-800
      '#365314', // lime-800
      '#064e3b', // emerald-800
      '#164e63', // cyan-800
      '#1e3a8a', // blue-800
      '#553c9a', // violet-800
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Discussion: {project.name}
            </h2>
            <p className="text-sm text-gray-500">
              {project.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-4xl text-gray-300 mb-2">💬</div>
                <p className="text-gray-500">No messages yet. Start the conversation!</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="mb-3">
                <div className="text-left">
                  <span 
                    className="font-bold"
                    style={{ color: getUserColor(message.userId) }}
                  >
                    {obfuscateUsername(message.userId)}
                  </span>
                  <span className="text-gray-900">: {message.content}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSending}
                ref={messageInputRef}
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending || newMessage.length > 1000}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSending ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  <span>→</span>
                )}
              </button>
            </div>
            {/* Character counter */}
            <div className="flex justify-end">
              <span className={`text-xs ${
                newMessage.length > 1000 
                  ? 'text-red-500 font-semibold' 
                  : newMessage.length > 900 
                    ? 'text-amber-500' 
                    : 'text-gray-400'
              }`}>
                {newMessage.length}/1000
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 