"use client"

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Toaster } from 'sonner';
import UserCategoryDisplay from '@/components/common/UserCategoryDisplay';
import { calculateProgressMetrics, getProjectHackatimeHours, ProgressMetrics } from '@/app/bay/page';
import { ProjectType } from '@/app/api/projects/route';
import { SessionWrapper } from '../bay/layout';
import { SessionProvider, useSession } from 'next-auth/react';
import MultiPartProgressBar, { ProgressSegment } from '@/components/common/MultiPartProgressBar';
import { Tooltip } from 'recharts';
import Modal from '@/components/common/Modal';

// Force dynamic rendering to prevent prerendering errors during build
export const dynamic = 'force-dynamic';

enum UserStatus {
  Unknown = "Unknown",
  L1 = "L1", 
  L2 = "L2",
  FraudSuspect = "FraudSuspect"
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  isAdmin: boolean;
  role: string;
  status: UserStatus;
  hackatimeId?: string;
  category?: {
    category: 'whale' | 'shipper' | 'newbie';
    description: string;
  } | null;
  projects: ProjectType[],
  identityToken?: string;
  purchasedProgressHours?: number;
  totalShellsSpent?: number;
}

// Sorting types
type SortField = 'progress' | 'role' | 'name' | 'shipped' | 'in_review' | 'default';
type SortOrder = 'asc' | 'desc';

// Create a wrapper component that uses Suspense
function LeaderboardContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('default');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  
  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else {
          console.error('Failed to fetch users:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUsers();
  }, []);

  /*
          //filter users by most overrided hours
        const usersWithMetrics = users.map(user => {
            const metrics = calculateProgressMetrics(user.projects);
            return {
                ...user,
                metrics,
            };
        });
        //sort users by most overrided hours
        const sortedUsers = usersWithMetrics.sort((a, b) => (b.metrics.shippedHours + b.metrics.viralHours) - (a.metrics.shippedHours + a.metrics.viralHours));
  */
  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle sort order if same field is clicked
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to appropriate order
      setSortField(field);
      setSortOrder(field === 'progress' ? 'desc' : 'asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  };
const usersWithMetrics = users.map(user => {
  const purchasedProgressHours = user.purchasedProgressHours || 0;
  const metrics = calculateProgressMetrics(user.projects, purchasedProgressHours);
  return {
    ...user,
    metrics,
  };
});
const sortedUsers = usersWithMetrics.sort((a, b) => (b.metrics.shippedHours + b.metrics.viralHours) - (a.metrics.shippedHours + a.metrics.viralHours));
  const filteredUsers = sortedUsers.filter(user => 
    (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  ).map(user => {
    try {
      const purchasedProgressHours = user.purchasedProgressHours || 0;
      return { ...user, stats: calculateProgressMetrics(user.projects || [], purchasedProgressHours) };
    } catch (error) {
      console.error('Error calculating progress metrics for user:', user.id, error);
      return { 
        ...user, 
        stats: {
          shippedHours: 0,
          viralHours: 0,
          otherHours: 0,
          totalHours: 0,
          totalPercentage: 0,
          totalPercentageWithPurchased: 0,
          rawHours: 0,
          currency: 0,
          purchasedProgressHours: 0,
          totalProgressWithPurchased: 0
        }
      };
    }
  }).sort((a, b) => {
    let result = 0;
    
    try {
      switch (sortField) {
        case 'progress':
          result = b.stats.totalPercentageWithPurchased - a.stats.totalPercentageWithPurchased;
          if (result === 0) {
            // Secondary sort by viral status
            result = +!!(b.projects || []).find(x=>x.viral) - +!!(a.projects || []).find(x=>x.viral);
          }
          break;
        case 'name':
          const nameA = (a.name || a.email || '').toLowerCase();
          const nameB = (b.name || b.email || '').toLowerCase();
          result = nameA.localeCompare(nameB);
          break;
        case 'shipped':
          result = (b.projects.filter(project => project.shipped).length || 0) - (a.projects.filter(project => project.shipped).length || 0);
          break;
        case 'in_review':
          result = (b.projects.filter(project => project.in_review).length || 0) - (a.projects.filter(project => project.in_review).length || 0);
          break;
        default:
          // sort by most overrided hours
          result = (b.metrics.shippedHours + b.metrics.viralHours) - (a.metrics.shippedHours + a.metrics.viralHours);
          break;
      }
      
      return sortOrder === 'asc' ? result : -result;
    } catch (error) {
      console.error('Error in sorting:', error);
      return 0;
    }
  });

    // Calculate total hours from shipped, viral, and other projects
    const calculateProgressSegments = (projects: ProjectType[], purchasedProgressHours: number = 0): ProgressSegment[] => {
        // Use centralized metrics with purchased progress
        const metrics = calculateProgressMetrics(projects, purchasedProgressHours);
        
        if (!projects || !Array.isArray(projects)) {
          return [{ value: 100, color: '#e5e7eb', tooltip: 'No projects found', status: 'pending' }];
        }
    
        // Convert hours to percentages (based on 60-hour goal)
        const shippedPercentage = (metrics.shippedHours / 60) * 100;
        const viralPercentage = (metrics.viralHours / 60) * 100;
        const otherPercentage = (metrics.otherHours / 60) * 100;
        const purchasedPercentage = (metrics.purchasedProgressHours / 60) * 100;
        
        // Create segments array
        const segments: ProgressSegment[] = [];
        
        // Add shipped segment if there are hours
        if (metrics.shippedHours > 0) {
          segments.push({
            value: shippedPercentage,
            color: '#10b981', // Green
            label: 'Shipped',
            tooltip: `${metrics.shippedHours.toFixed(1)} hours from shipped projects`,
            animated: false,
            status: 'completed'
          });
        }
        
        // Add viral segment if there are hours
        if (metrics.viralHours > 0) {
          segments.push({
            value: viralPercentage,
            color: '#f59e0b', // Gold/Yellow
            label: 'Viral',
            tooltip: `${metrics.viralHours.toFixed(1)} hours from viral projects`,
            animated: false,
            status: 'completed'
          });
        }
        
        // Add other segment if there are hours
        if (metrics.otherHours > 0) {
          segments.push({
            value: otherPercentage,
            color: '#3b82f6', // Blue
            label: 'In Progress',
            tooltip: `${metrics.otherHours.toFixed(1)} hours from in-progress projects`,
            animated: true,
            status: 'in-progress'
          });
        }
        
        // Add purchased progress segment if there are purchased hours
        if (purchasedPercentage > 0) {
          segments.push({
            value: purchasedPercentage,
            color: '#ec4899', // Pink
            label: 'Purchased',
            tooltip: `${metrics.purchasedProgressHours.toFixed(1)} hours purchased from shop`,
            animated: false,
            status: 'completed'
          });
        }
        
        // Add remaining segment if total < 100%
        if (metrics.totalPercentageWithPurchased < 100) {
          segments.push({
            value: 100 - metrics.totalPercentageWithPurchased,
            color: '#e5e7eb', // Light gray
            tooltip: 'Remaining progress needed',
            status: 'pending'
          });
        }
        
        return segments;
      };

  const getProgressBadge = (user: User, projects: ProjectType[]) => {
    try {
      const purchasedProgressHours = user.purchasedProgressHours || 0;
      const progressMetrics = calculateProgressMetrics(projects, purchasedProgressHours);

      return (
        <div style={{ width: '150px' }}>
          <div className="flex items-center justify-between w-full py-1 md:py-2">
            <div className="flex-grow px-2 sm:px-4 md:px-0">
              <div className="flex items-center justify-center gap-2 sm:gap-3 min-w-0">
                <Tooltip content={`You've built ${projects != undefined ? projects.length : 0} project${projects != null && projects.length !== 1 ? 's' : ''}, and grinded ${progressMetrics.rawHours} hour${progressMetrics.rawHours !== 1 ? 's' : ''} thus far`}>
                  <img src="/ship2.png" alt="Ship" className="h-12 sm:h-14 md:h-16 flex-shrink-0 flex items-center" />
                </Tooltip>
                <div 
                  className="flex-grow cursor-pointer min-w-0" 
                  onClick={() => setIsProgressModalOpen(true)}
                  title="When this progress bar reaches 100%, you're eligible for going to the island!"
                >
                  <MultiPartProgressBar 
                    segments={calculateProgressSegments(projects, purchasedProgressHours)}
                    max={100}
                    height={10}
                    rounded={true}
                    showLabels={false}
                    tooltipPosition="top"
                  />
                </div>
                <Tooltip content="Your prize - a fantastic island adventure with friends">
                  <img src="/island2.png" alt="Island" className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex-shrink-0 flex items-center" />
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error calculating progress metrics:', error);
      return (
        <div className="text-gray-400">Error</div>
      );
    }
  };

  // Debug logging can be removed in production
  // console.log('Users array length:', users.length);
  // console.log('Filtered users length:', filteredUsers.length);
  // console.log('Sort field:', sortField, 'Sort order:', sortOrder);
  // console.log('Search term:', searchTerm);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Shipwrecked Leaderboard</h1>
      </div>
      
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute right-3 top-3 text-gray-400">
            🔍
          </span>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-15">
                    #
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-40 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      User
                      <span className="text-xs">{getSortIcon('name')}</span>
                    </div>
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-24">
                    Joined
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-20 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('progress')}
                  >
                    <div className="flex items-center gap-1">
                      Progress
                      <span className="text-xs">{getSortIcon('progress')}</span>
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-30 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('shipped')}
                  >
                    <div className="flex items-center gap-1">
                      # Shipped
                      <span className="text-xs">{getSortIcon('shipped')}</span>
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-30 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('in_review')}
                  >
                    <div className="flex items-center gap-1">
                      # In Review
                      <span className="text-xs">{getSortIcon('in_review')}</span>
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-30 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('in_review')}
                  >
                    <div className="flex items-center gap-1">
                      clamshells
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr key={user.id}>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-500">
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.image ? (
                            <img className="h-8 w-8 rounded-full mr-2" src={user.image} alt={user.name || 'User'} />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                              <span className="text-gray-600 font-bold text-xs">{(user.name || user.email || 'U').charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-4">
                              {user.name || 'Unknown'}
                              {user.stats?.totalPercentageWithPurchased === 100 && (
                                <div className="ml-1 align-middle inline-block bg-blue-500 text-white rounded-full px-2 py-1 text-xs">
                                  <span>Invited</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-xs text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {getProgressBadge(user, user.projects)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.projects.filter(project => project.shipped).length}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.projects.filter(project => project.in_review).length}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {Math.max(0, calculateProgressMetrics(user.projects).currency - (user.totalShellsSpent || 0))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden">
            {/* Mobile Sort Controls */}
            <div className="mb-4 bg-white rounded-lg shadow p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Sort by:</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSort('name')}
                  className={`px-3 py-1 text-xs rounded-full border ${
                    sortField === 'name' 
                      ? 'bg-blue-100 border-blue-300 text-blue-800' 
                      : 'bg-gray-100 border-gray-300 text-gray-700'
                  }`}
                >
                  Name {sortField === 'name' && getSortIcon('name')}
                </button>
                <button
                  onClick={() => handleSort('progress')}
                  className={`px-3 py-1 text-xs rounded-full border ${
                    sortField === 'progress' 
                      ? 'bg-blue-100 border-blue-300 text-blue-800' 
                      : 'bg-gray-100 border-gray-300 text-gray-700'
                  }`}
                >
                  Progress {sortField === 'progress' && getSortIcon('progress')}
                </button>
                
              </div>
            </div>
            
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredUsers.map((user, index) => (
                  <div 
                    key={user.id}
                    className="block bg-white rounded-lg shadow-md overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-center mb-3">
                        <div className="text-lg font-medium text-gray-500 mr-3">
                          #{index + 1}
                        </div>
                        {user.image ? (
                          <img className="h-12 w-12 rounded-full mr-3" src={user.image} alt={user.name || 'User'} />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                            <span className="text-gray-600 font-bold">{(user.name || user.email || 'U').charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div>
                          <div className="text-base font-medium text-gray-900 flex items-center gap-1">
                            {user.name || 'Unknown'}
                            {user.stats?.totalPercentageWithPurchased === 100 && (
                                <div className="ml-1 align-middle inline-block bg-blue-500 text-white rounded-full px-2 py-1 text-xs">
                                  <span>Invited</span>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-3 text-sm">
                        <div>
                          <span className="text-gray-500 block">Progress</span>
                          {getProgressBadge(user, user.projects)}
                        </div>
                        <div>
                          <span className="text-gray-500 block"># Shipped</span>
                          <span className="text-gray-800">
                            {user.projects.filter(project => project.shipped).length}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block"># In Review</span>
                          <span className="text-gray-800">
                            {user.projects.filter(project => project.in_review).length}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Clamshells</span>
                          <span className="text-gray-800">
                            {Math.max(0, calculateProgressMetrics(user.projects).currency - (user.totalShellsSpent || 0))}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Joined</span>
                          <span className="text-gray-800">
                            {new Date(user.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

                     {/* Progress Information Modal */}
                     <Modal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        title="Progress Information"
        okText="Got it!"
      >
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-3">Your Journey to Shipwrecked</h3>
          <p className="mb-4">
            The progress bar shows your completion percentage towards the 60-hour goal required to qualify for Shipwrecked.
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-2">Progress Bar Legend:</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#10b981' }}></span>
                <strong>Green:</strong> Hours from shipped projects (projects marked as "shipped")
              </li>
              <li>
                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#f59e0b' }}></span>
                <strong>Gold:</strong> Hours from viral projects
              </li>
              <li>
                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#3b82f6' }}></span>
                <strong>Blue:</strong> Hours from in-progress projects (not yet shipped or viral)
              </li>
              <li>
                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#ec4899' }}></span>
                <strong>Pink:</strong> Hours purchased from the shop
              </li>
              <li>
                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#e5e7eb' }}></span>
                <strong>Gray:</strong> Remaining progress needed to reach 100%
              </li>
            </ul>
            <p className="mt-3 text-sm text-gray-600">
              Hover over each segment in the progress bar to see the exact hours contributed by each category.
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-2">Requirements for Shipwrecked:</h4>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Complete at least 60 hours of development time (roughly 15 hours per project) and ship 4 fully deployed projects
              </li>
              <li>
                Make at least one of your projects go viral according to our <a href="/info/go-viral" className="text-blue-600 hover:underline">defined criteria</a>
              </li>
            </ol>
          </div>
        </div>
      </Modal>
      

      <Toaster richColors />
    </div>
  );
}

// Main component that wraps the content with Suspense
export default function Users() {
  return (
    <SessionProvider>
      <SessionWrapper>
        <Suspense fallback={<div>Loading users...</div>}>
        <div className="min-h-screen flex flex-col p-6">
          <LeaderboardContent />
        </div>
      </Suspense>
      </SessionWrapper>
    </SessionProvider>
  );
}
