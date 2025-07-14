'use client';

import { useState, useRef, useEffect } from 'react';
import Icon from '@hackclub/icons';
import { HackatimeLanguage } from '@/types/hackatime';

interface HackatimeUserStatsData {
  user: {
    id: string;
    name: string | null;
    hackatimeId: string;
  };
  languages: HackatimeLanguage[];
  summary: {
    username: string;
    total_seconds: number;
    human_readable_total: string;
    range: string;
    project_filtered?: boolean;
  };
  projectNames?: string | null;
}

interface HackatimeLanguageStatsProps {
  className?: string;
  userId?: string; // ID of the project owner whose stats to fetch
  projectNames?: string[]; // Array of project names to filter stats by
}

export default function HackatimeLanguageStats({ className = '', userId, projectNames }: HackatimeLanguageStatsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<HackatimeUserStatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset data when userId or projectNames changes
  useEffect(() => {
    setData(null);
    setError(null);
    setIsOpen(false);
  }, [userId, projectNames]);

  const fetchLanguageStats = async () => {
    if (data || isLoading) return; // Don't fetch if we already have data or are loading

    // Don't fetch if no userId is provided
    if (!userId) {
      setError('User ID not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = new URL('/api/hackatime/user-stats', window.location.origin);
      url.searchParams.set('userId', userId);
      if (projectNames && projectNames.length > 0) {
        // Join project names with commas for the API
        url.searchParams.set('projectNames', projectNames.join(','));
      }
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      setData(result);
    } catch (err) {
      console.error('Error fetching Hackatime language stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch language stats');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDropdown = () => {
    if (!isOpen) {
      fetchLanguageStats(); // Only fetch when opening
    }
    setIsOpen(!isOpen);
  };

  const getLanguageIcon = (languageName: string) => {
    const name = languageName.toLowerCase();
    switch (name) {
      case 'javascript':
      case 'js':
        return '🟨';
      case 'typescript':
      case 'ts':
        return '🔵';
      case 'python':
        return '🐍';
      case 'css':
        return '🎨';
      case 'html':
        return '🌐';
      case 'jsx':
        return '⚛️';
      case 'tsx':
        return '⚛️';
      case 'bash':
      case 'shell':
        return '🐚';
      case 'json':
        return '📄';
      case 'markdown':
      case 'md':
        return '📝';
      case 'rust':
        return '🦀';
      case 'go':
        return '🐹';
      case 'java':
        return '☕';
      case 'c++':
      case 'cpp':
        return '⚡';
      case 'c':
        return '🔧';
      default:
        return '📊';
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={handleToggleDropdown}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading || !userId}
      >
        <div className="flex items-center gap-2">
          <Icon glyph="code" size={16} />
          <span>
            {isLoading 
              ? 'Loading...' 
              : !userId 
                ? 'User data unavailable' 
                : projectNames && projectNames.length > 0
                  ? `View Language Stats (${projectNames.length} projects)`
                  : 'View Language Stats'
            }
          </span>
        </div>
        <Icon glyph={isOpen ? 'up-caret' : 'down-caret'} size={14} />
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Fetching language stats...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 text-center">
              <div className="text-red-600 text-sm">
                <Icon glyph="important" size={16} className="inline mr-1" />
                {error}
              </div>
            </div>
          )}

          {data && !isLoading && (
            <div className="p-4">
              {/* Header */}
              <div className="mb-3 pb-2 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {data.summary.project_filtered 
                    ? `Programming Languages (Top 10)`
                    : 'Top Programming Languages'
                  }
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {data.summary.human_readable_total} total • {data.summary.range}
                  {data.summary.project_filtered && (
                    <span className="ml-1 text-blue-600">• Project filtered</span>
                  )}
                </p>
              </div>

              {/* Language List */}
              <div className="space-y-2">
                {data.languages.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">
                    No language data available
                  </p>
                ) : (
                  data.languages.map((language) => (
                    <div key={language.name} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-lg">{getLanguageIcon(language.name)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-gray-900 truncate">
                              {language.name}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              {language.percent.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-600">
                              {language.text}
                            </span>
                            <span className="text-xs text-gray-500">
                              {language.digital}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {data.languages.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    Data from Hackatime • Updated automatically
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
