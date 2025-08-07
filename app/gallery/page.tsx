'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/common/Header';
import ImageWithFallback from '@/components/common/ImageWithFallback';
import Icon from '@hackclub/icons';
import dynamic from 'next/dynamic';
import Toast from '@/components/common/Toast';
import Image from 'next/image';
import { createAvatar } from '@dicebear/core';
import { thumbs } from '@dicebear/collection';
import { useExperienceMode } from '@/lib/useExperienceMode';

// Dynamically import the chat modal to avoid SSR issues with socket.io
const ProjectChatModal = dynamic(() => import('@/components/common/ProjectChatModal'), {
  ssr: false
});

interface Project {
  projectID: string;
  name: string;
  description: string;
  codeUrl: string;
  playableUrl: string;
  screenshot: string;
  shipped: boolean;
  viral: boolean;
  userId: string;
  rawHours: number;
  hackatimeName: string;
  upvoteCount: number;
  userUpvoted: boolean;
  chat_enabled: boolean;
  chatCount: number;
  lastChatActivity: string | null;
  // No tag data exposed in gallery - server-side filtering only
  user: {
    name: string | null;
    slack: string | null;
    image: string | null;
  };
  hackatimeLinks: {
    id: string;
    hackatimeName: string;
    rawHours: number;
    hoursOverride?: number;
  }[];
}

type SortOption = 'hasImage' | 'hours' | 'alphabetical' | 'upvotes' | 'discussions' | 'recentChat';

// Helper function to check if a URL is a valid image
const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];
  const lowerUrl = url.toLowerCase();
  
  return imageExtensions.some(ext => lowerUrl.includes(ext));
};

export default function Gallery() {
  const { data: session, status } = useSession();
  const { isIslandMode, isLoading: isExperienceModeLoading } = useExperienceMode();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  
  // Toast function
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
  };
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [showViral, setShowViral] = useState(false);
  const [showShipped, setShowShipped] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('upvotes');

  // Upvote loading state
  const [upvotingProjects, setUpvotingProjects] = useState<Set<string>>(new Set());

  // Chat modal state
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedProjectForChat, setSelectedProjectForChat] = useState<Project | null>(null);

  // Handle opening chat modal
  const handleOpenChat = (project: Project) => {
    setSelectedProjectForChat(project);
    setChatModalOpen(true);
  };

  // Handle closing chat modal
  const handleCloseChat = () => {
    setChatModalOpen(false);
    setSelectedProjectForChat(null);
  };

  // Handle state cleanup when switching experience modes
  useEffect(() => {
    if (isIslandMode) {
      // Reset viral filter and hours sort when entering island mode
      setShowViral(false);
      if (sortBy === 'hours') {
        setSortBy('upvotes'); // Default to upvotes sort in island mode
      }
    }
  }, [isIslandMode, sortBy]);

  // Calculate total projects for current experience mode (server-side filtered, so just use length)
  const totalProjectsForCurrentMode = projects.length;

  useEffect(() => {
    async function fetchProjects() {
      try {
        const timestamp = Date.now();
        const url = `/api/gallery?isIslandMode=${isIslandMode}&_t=${timestamp}`;
        
        const response = await fetch(url, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        } else {
          setError('Failed to fetch projects');
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setError('Failed to fetch projects');
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'authenticated' && !isExperienceModeLoading) {
      fetchProjects();
    }
  }, [status, isIslandMode, isExperienceModeLoading]);

  // Filter and sort projects (server-side filtering by experience mode already applied)
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' || 
        project.name.toLowerCase().includes(searchLower) ||
        project.description?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Status filters - intersection logic (AND)
      // If no filters are selected, show all projects
      if (!showViral && !showShipped) {
        return true;
      }

      // If both filters are selected, project must be both viral AND shipped
      if (showViral && showShipped) {
        return project.viral && project.shipped;
      }

      // If only viral is selected, project must be viral
      if (showViral && !showShipped) {
        return project.viral;
      }

      // If only shipped is selected, project must be shipped
      if (!showViral && showShipped) {
        return project.shipped;
      }

      return false;
    });

    // Sort projects
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'hasImage':
          const aHasValidImage = isValidImageUrl(a.screenshot);
          const bHasValidImage = isValidImageUrl(b.screenshot);
          if (aHasValidImage && !bHasValidImage) return -1;
          if (!aHasValidImage && bHasValidImage) return 1;
          return a.name.localeCompare(b.name);
        case 'hours':
          return b.rawHours - a.rawHours;
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'upvotes':
          return b.upvoteCount - a.upvoteCount;
        case 'discussions':
          return b.chatCount - a.chatCount;
        case 'recentChat':
          // Sort by most recent chat activity first, then by project name for consistency
          if (!a.lastChatActivity && !b.lastChatActivity) return a.name.localeCompare(b.name);
          if (!a.lastChatActivity) return 1; // Projects without chat go to the end
          if (!b.lastChatActivity) return -1; // Projects with chat come first
          return new Date(b.lastChatActivity).getTime() - new Date(a.lastChatActivity).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [projects, searchQuery, showViral, showShipped, sortBy]);

  // Handle upvote/downvote
  const handleUpvote = async (projectID: string) => {
    if (upvotingProjects.has(projectID)) return; // Prevent double-clicking

    setUpvotingProjects(prev => new Set(prev).add(projectID));

    try {
      const response = await fetch(`/api/projects/${projectID}/upvote`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update the project in the state
        setProjects(prevProjects => 
          prevProjects.map(project => 
            project.projectID === projectID
              ? {
                  ...project,
                  upvoteCount: result.upvoteCount,
                  userUpvoted: result.upvoted,
                }
              : project
          )
        );
      } else {
        console.error('Failed to upvote project');
      }
    } catch (error) {
      console.error('Error upvoting project:', error);
    } finally {
      setUpvotingProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectID);
        return newSet;
      });
    }
  };

  if (status === "loading" || isExperienceModeLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Please sign in to view the gallery.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header session={session} status={status} />
      <main className="container mx-auto px-4 py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Projects
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, description, or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Icon 
                  glyph="search" 
                  size={16} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            {/* Status Filters */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <div className="flex gap-4 py-2">
                {/* Hide viral filter in island mode since island projects don't use viral status */}
                {!isIslandMode && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showViral}
                      onChange={(e) => setShowViral(e.target.checked)}
                      className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Viral</span>
                  </label>
                )}
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showShipped}
                    onChange={(e) => setShowShipped(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Shipped</span>
                </label>
              </div>
            </div>

            {/* Sort Options */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort by
              </label>
              <div className="flex flex-wrap gap-2">
                <label className="w-18">
                  <input
                    type="radio"
                    name="sortBy"
                    value="upvotes"
                    checked={sortBy === 'upvotes'}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="sr-only"
                  />
                  <div className={`cursor-pointer px-1 py-2 text-xs font-medium rounded-lg text-center transition-colors whitespace-nowrap overflow-hidden ${
                    sortBy === 'upvotes'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`} style={{ fontSize: '11px' }}>
                    Upvotes
                  </div>
                </label>
                <label className="w-18">
                  <input
                    type="radio"
                    name="sortBy"
                    value="hasImage"
                    checked={sortBy === 'hasImage'}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="sr-only"
                  />
                  <div className={`cursor-pointer px-1 py-2 text-xs font-medium rounded-lg text-center transition-colors whitespace-nowrap overflow-hidden ${
                    sortBy === 'hasImage'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`} style={{ fontSize: '11px' }}>
                    Images
                  </div>
                </label>
                {/* Hide hours sort in island mode since island projects don't use traditional hour tracking */}
                {!isIslandMode && (
                  <label className="w-18">
                    <input
                      type="radio"
                      name="sortBy"
                      value="hours"
                      checked={sortBy === 'hours'}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="sr-only"
                    />
                    <div className={`cursor-pointer px-1 py-2 text-xs font-medium rounded-lg text-center transition-colors whitespace-nowrap overflow-hidden ${
                      sortBy === 'hours'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`} style={{ fontSize: '11px' }}>
                      Hours
                    </div>
                  </label>
                )}
                <label className="w-18">
                  <input
                    type="radio"
                    name="sortBy"
                    value="alphabetical"
                    checked={sortBy === 'alphabetical'}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="sr-only"
                  />
                  <div className={`cursor-pointer px-1 py-2 text-xs font-medium rounded-lg text-center transition-colors whitespace-nowrap overflow-hidden ${
                    sortBy === 'alphabetical'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`} style={{ fontSize: '11px' }}>
                    A-Z
                  </div>
                </label>
                <label className="w-18">
                  <input
                    type="radio"
                    name="sortBy"
                    value="discussions"
                    checked={sortBy === 'discussions'}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="sr-only"
                  />
                  <div className={`cursor-pointer px-1 py-2 text-xs font-medium rounded-lg text-center transition-colors whitespace-nowrap overflow-hidden ${
                    sortBy === 'discussions'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`} style={{ fontSize: '11px' }}>
                    Chats
                  </div>
                </label>
                <label className="w-18">
                  <input
                    type="radio"
                    name="sortBy"
                    value="recentChat"
                    checked={sortBy === 'recentChat'}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="sr-only"
                  />
                  <div className={`cursor-pointer px-1 py-2 text-xs font-medium rounded-lg text-center transition-colors whitespace-nowrap overflow-hidden ${
                    sortBy === 'recentChat'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`} style={{ fontSize: '11px' }}>
                    New Chats
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Showing {filteredAndSortedProjects.length} of {totalProjectsForCurrentMode} projects
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading projects...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredAndSortedProjects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">
              {projects.length === 0 ? 'No projects found.' : 'No projects match your current filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedProjects.map((project) => (
              <div 
                key={project.projectID} 
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Project Screenshot */}
                <div className="relative h-48 w-full">
                  {project.screenshot ? (
                    <ImageWithFallback
                      src={project.screenshot} 
                      alt={project.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400">No Screenshot</span>
                    </div>
                  )}
                </div>

                {/* Project Info */}
                <div className="p-4">
                  <div className="flex flex-col">
                    <div className="flex flex-row items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {project.name}
                      </h3>
                      {project.rawHours > 0 && (
                            <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                              {project.rawHours}h
                            </span>
                          )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                          <Image 
                            src={project.user.image ? project.user.image : createAvatar(thumbs, { seed: project.userId }).toDataUri()} 
                            alt={project.user.name || ''} 
                            width={20}
                            height={20}
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-sm text-gray-600">
                            {project.user.slack ? (
                              <a 
                                href={`https://hackclub.slack.com/app_redirect?channel=${project.user.slack}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline decoration-blue-500 decoration-wavy"
                              >
                                {project.user.name || 'Anonymous'}
                              </a>
                            ) : (
                              project.user.name || 'Anonymous'
                            )}
                          </span>
                          
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Upvote button */}
                        <button
                          onClick={() => handleUpvote(project.projectID)}
                          disabled={upvotingProjects.has(project.projectID)}
                          className={`flex items-center justify-center gap-1 px-2 py-1 rounded-full text-sm font-medium transition-all min-w-[60px] ${
                            project.userUpvoted
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          } ${
                            upvotingProjects.has(project.projectID)
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer hover:scale-105'
                          }`}
                        >
                          <span 
                            className={`text-lg ${
                              project.userUpvoted
                                ? 'text-yellow-500'
                                : 'text-gray-400'
                            }`}
                          >
                            ★
                          </span>
                          <span className="tabular-nums">{project.upvoteCount}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Project Links */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {project.codeUrl && (
                      <a 
                        href={project.codeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Icon glyph="github" size={14} />
                        Code
                      </a>
                    )}
                    {project.playableUrl && (
                      <a 
                        href={project.playableUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Icon glyph="link" size={14} />
                        Demo
                      </a>
                    )}
                    {/* Chat button - only show if chat is enabled */}
                    {project.chat_enabled && (
                      <button
                        onClick={() => handleOpenChat(project)}
                        className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm font-medium transition-colors"
                      >
                        <span className="text-sm">💬</span>
                        {project.chatCount > 0 ? (
                          <>Discuss ({project.chatCount > 99 ? '99+' : project.chatCount})</>
                        ) : (
                          <>Discuss...</>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Status Badges */}
                  <div className="flex gap-1">
                    {project.viral && (
                      <span className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded-full">
                        Viral
                      </span>
                    )}
                    {project.shipped && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Shipped
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chat Modal */}
        {selectedProjectForChat && (
          <ProjectChatModal
            isOpen={chatModalOpen}
            onClose={handleCloseChat}
            project={selectedProjectForChat}
            showToast={showToast}
          />
        )}
        
        {/* Toast notifications */}
        {toastMessage && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setToastMessage(null)}
          />
        )}
      </main>
    </div>
  );
} 