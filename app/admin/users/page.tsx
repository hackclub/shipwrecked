"use client"

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import UserCategoryDisplay from '@/components/common/UserCategoryDisplay';
import { calculateProgressMetrics, getProjectHackatimeHours, ProgressMetrics } from '@/lib/project-client';
import { ProjectType } from '@/app/api/projects/route';
import SendModal from '@/app/components/communication/sendModal';
import TagManagement from '@/components/common/TagManagement';
import Modal from '@/components/common/Modal';

// Force dynamic rendering to prevent prerendering errors during build
export const dynamic = 'force-dynamic';

enum UserStatus {
  Unknown = "Unknown",
  L1 = "L1", 
  L2 = "L2",
  FraudSuspect = "FraudSuspect"
}

interface Tag {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  userCount?: number;
  projectCount?: number;
  totalUsage?: number;
}

interface UserTag {
  id: string;
  tagId: string;
  createdAt: string;
  tag: Tag;
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
  userTags?: UserTag[];
}

// Sorting types
type SortField = 'progress' | 'role' | 'name' | 'shipped' | 'in_review' | 'default';
type SortOrder = 'asc' | 'desc';

// Create a wrapper component that uses Suspense
function AdminUsersContent() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmUserEmail, setConfirmUserEmail] = useState('');
  const [sortField, setSortField] = useState<SortField>('default');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [briefMode, setBriefMode] = useState(true);
  const [tagManagementUser, setTagManagementUser] = useState<User | null>(null);
  const [isTagManagementOpen, setIsTagManagementOpen] = useState(false);

  // Load brief mode preference from cookie on mount
  useEffect(() => {
    const savedBriefMode = document.cookie
      .split('; ')
      .find(row => row.startsWith('adminUsersBriefMode='))
      ?.split('=')[1];
    if (savedBriefMode !== undefined) {
      setBriefMode(savedBriefMode === 'true');
    }
  }, []);

  // Save brief mode preference to cookie when changed
  const toggleBriefMode = () => {
    const newBriefMode = !briefMode;
    setBriefMode(newBriefMode);
    document.cookie = `adminUsersBriefMode=${newBriefMode}; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year
  };

  // Tag management functions
  const openTagManagement = (user: User) => {
    setTagManagementUser(user);
    setIsTagManagementOpen(true);
  };

  const closeTagManagement = () => {
    setTagManagementUser(null);
    setIsTagManagementOpen(false);
  };

  const handleTagsUpdated = () => {
    // Refresh users list to get updated tags
    if (status === 'authenticated') {
      async function fetchUsers() {
        try {
          const response = await fetch('/api/admin/users');
          if (response.ok) {
            const data = await response.json();
            setUsers(data);
            
            // Update the tagManagementUser with fresh data if modal is still open
            if (tagManagementUser) {
              const updatedUser = data.find((user: User) => user.id === tagManagementUser.id);
              if (updatedUser) {
                setTagManagementUser(updatedUser);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching users:', error);
        }
      }
      fetchUsers();
    }
  };
  
  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/admin/users');
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
    
    if (status === 'authenticated') {
      fetchUsers();
    }
  }, [status]);

  // Fetch available tags
  useEffect(() => {
    async function fetchTags() {
      try {
        setIsLoadingTags(true);
        const response = await fetch('/api/admin/tags');
        if (response.ok) {
          const tags = await response.json();
          setAvailableTags(tags);
        } else {
          console.error('Failed to fetch tags:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      } finally {
        setIsLoadingTags(false);
      }
    }
    
    if (status === 'authenticated') {
      fetchTags();
    }
  }, [status]);

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

  const filteredUsers = users.filter(user => {
    // Text search filter
    const matchesSearch = (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                         (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    // Tag filter
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.every(selectedTagId => 
                         user.userTags?.some(userTag => userTag.tag.id === selectedTagId)
                       );
    
    return matchesSearch && matchesTags;
  }).map(user => {
    try {
      return { ...user, stats: calculateProgressMetrics(user.projects || [], user.purchasedProgressHours || 0) };
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
          rawHours: 0,
          currency: 0
        }
      };
    }
  }).sort((a, b) => {
    let result = 0;
    
    try {
      switch (sortField) {
        case 'progress':
          result = b.stats.totalPercentage - a.stats.totalPercentage;
          if (result === 0) {
            // Secondary sort by viral status
            result = +!!(b.projects || []).find(x=>x.viral) - +!!(a.projects || []).find(x=>x.viral);
          }
          break;
        case 'role':
          const roleOrder = { 'Admin': 3, 'Reviewer': 2, 'User': 1 };
          result = (roleOrder[a.role as keyof typeof roleOrder] || 0) - (roleOrder[b.role as keyof typeof roleOrder] || 0);
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
          // Default sorting (original logic)
          result = b.stats.totalPercentage - a.stats.totalPercentage;
          if (result === 0) {
            result = +!!(b.projects || []).find(x=>x.viral) - +!!(a.projects || []).find(x=>x.viral);
          }
          break;
      }
      
      return sortOrder === 'asc' ? result : -result;
    } catch (error) {
      console.error('Error in sorting:', error);
      return 0;
    }
  });

  // Function to render status badge
  const getUserStatusBadge = (userStatus: UserStatus) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    
    switch(userStatus) {
      case UserStatus.L1:
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case UserStatus.L2:
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case UserStatus.FraudSuspect:
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
      default:
        // Keep default gray for Unknown
        break;
    }
    
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>
        {userStatus === UserStatus.FraudSuspect ? 'Fraud Suspect' : userStatus}
      </span>
    );
  };
  const getProgressBadge = (user: User & { stats: ProgressMetrics }) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
	let label = "";

	  
  let meetsRequirements = false;

  let top4Projects = []
  for (const project of user.projects) {
    if (project.shipped && getProjectHackatimeHours(project) >= 10) {
      top4Projects.push(getProjectHackatimeHours(project));
    }
  }
  if (top4Projects.length >= 4) {
    top4Projects.sort((a, b) => b - a);
    top4Projects = top4Projects.slice(0, 4);
    if (top4Projects.reduce((acc, current) => acc + current, 0) >= 60) {
      meetsRequirements = true;
    }
  }

  if (meetsRequirements) {
    if (!!user.projects.find(project => project.viral)) {
      bgColor = "bg-yellow-100";
      textColor = "text-yellow-800";
      label = "Invitation";
    } else {
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
      label = "Waitlist";
    }
  }
    
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>
        {user.stats.totalPercentageWithPurchased.toFixed(1)}%{label.length ? " - " + label : ""}
      </span>
    );
  };

  // Function to handle user deletion
  const handleDeleteUser = async () => {
    if (!userToDelete || !userToDelete.email) return;
    
    if (confirmUserEmail !== userToDelete.email) {
      toast.error("Email doesn't match. Deletion aborted.");
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove the user from the state
        setUsers(users.filter(user => user.id !== userToDelete.id));
        toast.success('User deleted successfully');
        setShowDeleteModal(false);
        setConfirmUserEmail('');
      } else {
        const error = await response.json();
        toast.error(`Failed to delete user: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  // Function to open the delete confirmation modal
  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setConfirmUserEmail('');
    setShowDeleteModal(true);
  };

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You need to be logged in to access the admin area.</p>
          <Link 
            href="/api/auth/signin"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Debug logging can be removed in production
  // console.log('Users array length:', users.length);
  // console.log('Filtered users length:', filteredUsers.length);
  // console.log('Sort field:', sortField, 'Sort order:', sortOrder);
  // console.log('Search term:', searchTerm);

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Administrate Users</h1>
        <button
          onClick={toggleBriefMode}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
            briefMode
              ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          title="Toggle brief mode to show fewer columns"
        >
          <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
            briefMode 
              ? 'border-blue-500 bg-blue-500' 
              : 'border-gray-300 bg-white'
          }`}>
            {briefMode && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          Brief Mode
        </button>
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

      {/* Tag Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Filter by tags:</span>
          {isLoadingTags ? (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
              Loading tags...
            </div>
          ) : (
            <>
              <button
                onClick={() => setSelectedTags([])}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  selectedTags.length === 0
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Users ({users.length})
              </button>
              {availableTags.map(tag => {
                const isSelected = selectedTags.includes(tag.id);
                const usersWithTag = users.filter(user => 
                  user.userTags?.some(userTag => userTag.tag.id === tag.id)
                ).length;
                
                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTags(prev => prev.filter(id => id !== tag.id));
                      } else {
                        setSelectedTags(prev => [...prev, tag.id]);
                      }
                    }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                      isSelected
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: isSelected ? (tag.color || '#374151') : undefined,
                      borderColor: tag.color || '#d1d5db',
                      ...(isSelected ? {} : { border: '1px solid' })
                    }}
                    title={tag.description || undefined}
                  >
                    {tag.name} ({usersWithTag})
                  </button>
                );
              })}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                  title="Clear all tag filters"
                >
                  Clear filters
                </button>
              )}
            </>
          )}
        </div>
        {selectedTags.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            Showing users with {selectedTags.length === 1 ? 'tag' : 'all tags'}: {' '}
            {selectedTags.map(tagId => {
              const tag = availableTags.find(t => t.id === tagId);
              return tag?.name;
            }).join(', ')}
          </div>
        )}
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
                  {!briefMode && (
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-15">
                      #
                    </th>
                  )}
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
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-48">
                    Email
                  </th>
                  {!briefMode && (
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-24">
                      Joined
                    </th>
                  )}
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-20">
                    Status
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
                  {!briefMode && (
                    <>
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
                    </>
                  )}
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-20 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center gap-1">
                      Role
                      <span className="text-xs">{getSortIcon('role')}</span>
                    </div>
                  </th>
                  {!briefMode && (
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-24">
                      Category
                    </th>
                  )}
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-32">
                    Tags
                  </th>
                  {!briefMode && (
                    <>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-20">
                        Verified
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-20">
                        Identity
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-20">
                        Hackatime
                      </th>
                    </>
                  )}
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={briefMode ? 7 : 14} className="px-3 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr key={user.id}>
                      {!briefMode && (
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-500">
                            {index + 1}
                          </div>
                        </td>
                      )}
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
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || 'Unknown'}
                              <SendModal name={user.name || 'Unknown'} email={user.email || 'Unknown'} userId={user.id} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm text-gray-900 truncate max-w-48" title={user.email || ''}>
                          {user.email}
                        </div>
                      </td>
                      {!briefMode && (
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: '2-digit'
                            })}
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {getUserStatusBadge(user.status)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {getProgressBadge(user)}
                      </td>
                      {!briefMode && (
                        <>
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
                        </>
                      )}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                          user.role === 'Admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : user.role === 'Reviewer'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      {!briefMode && (
                        <td className="px-3 py-3 whitespace-nowrap">
                          <UserCategoryDisplay category={user.category} size="small" />
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-wrap gap-1 max-w-32">
                            {user.userTags && user.userTags.length > 0 ? (
                              user.userTags.slice(0, 2).map((userTag) => (
                                <span
                                  key={userTag.id}
                                  className="inline-flex items-center px-2 py-1 text-xs rounded-full border"
                                  style={{
                                    backgroundColor: userTag.tag.color ? `${userTag.tag.color}20` : '#f3f4f6',
                                    borderColor: userTag.tag.color || '#d1d5db',
                                    color: userTag.tag.color || '#374151'
                                  }}
                                  title={`${userTag.tag.name}${userTag.tag.description ? ': ' + userTag.tag.description : ''}`}
                                >
                                  {userTag.tag.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">No tags</span>
                            )}
                            {user.userTags && user.userTags.length > 2 && (
                              <span className="inline-flex items-center px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded-full border border-gray-200">
                                +{user.userTags.length - 2}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => openTagManagement(user)}
                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Manage tags"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      {!briefMode && (
                        <>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                              user.emailVerified 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.emailVerified ? '✓' : '✗'}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                              user.identityToken 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.identityToken ? '✓' : '✗'}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {user.hackatimeId ? (
                              <div className="text-xs text-gray-600 truncate max-w-16" title={user.hackatimeId}>
                                {user.hackatimeId}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="px-3 py-3 whitespace-nowrap text-right text-xs">
                        <div className="flex gap-2 justify-end">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </Link>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => openDeleteModal(user)}
                          >
                            Del
                          </button>
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
                <button
                  onClick={() => handleSort('role')}
                  className={`px-3 py-1 text-xs rounded-full border ${
                    sortField === 'role' 
                      ? 'bg-blue-100 border-blue-300 text-blue-800' 
                      : 'bg-gray-100 border-gray-300 text-gray-700'
                  }`}
                >
                  Role {sortField === 'role' && getSortIcon('role')}
                </button>
                <button
                  onClick={() => handleSort('default')}
                  className={`px-3 py-1 text-xs rounded-full border ${
                    sortField === 'default' 
                      ? 'bg-blue-100 border-blue-300 text-blue-800' 
                      : 'bg-gray-100 border-gray-300 text-gray-700'
                  }`}
                >
                  Default {sortField === 'default' && getSortIcon('default')}
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
                          <div className="text-base font-medium text-gray-900">
                            {user.name || 'Unknown'}
                            <SendModal name={user.name || 'Unknown'} email={user.email || 'Unknown'} userId={user.id} />
                          </div>
                          <div className="text-sm text-gray-600">
                            {user.email}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-3 text-sm">
                        <div>
                          <span className="text-gray-500 block">Status</span>
                          {getUserStatusBadge(user.status)}
                        </div>
                        <div>
                          <span className="text-gray-500 block">Progress</span>
                          {getProgressBadge(user)}
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
                          <span className="text-gray-500 block">Role</span>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'Admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : user.role === 'Reviewer'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Category</span>
                          <UserCategoryDisplay category={user.category} size="small" />
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 block">Tags</span>
                            <button
                              onClick={() => openTagManagement(user)}
                              className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Manage tags"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.userTags && user.userTags.length > 0 ? (
                              user.userTags.map((userTag) => (
                                <span
                                  key={userTag.id}
                                  className="inline-flex items-center px-2 py-1 text-xs rounded-full border"
                                  style={{
                                    backgroundColor: userTag.tag.color ? `${userTag.tag.color}20` : '#f3f4f6',
                                    borderColor: userTag.tag.color || '#d1d5db',
                                    color: userTag.tag.color || '#374151'
                                  }}
                                  title={`${userTag.tag.name}${userTag.tag.description ? ': ' + userTag.tag.description : ''}`}
                                >
                                  {userTag.tag.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">No tags</span>
                            )}
                          </div>
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
                        <div>
                          <span className="text-gray-500 block">Email Verified?</span>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.emailVerified 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user.emailVerified ? 'Verified' : 'No'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Identity Verified?</span>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.identityToken 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user.identityToken ? 'Verified' : 'No'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Hackatime</span>
                          {user.hackatimeId ? (
                            <div className="text-sm text-gray-600">{user.hackatimeId}</div>
                          ) : (
                            <span className="text-gray-400 text-xs">Not connected</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4 border-t border-gray-100 pt-3 flex justify-between">
                        <Link 
                          href={`/admin/users/${user.id}`}
                          className="text-blue-600 font-medium"
                        >
                          Edit User
                        </Link>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="text-red-600 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Tag Management Modal */}
      {isTagManagementOpen && tagManagementUser && (
        <Modal 
          isOpen={isTagManagementOpen}
          onClose={closeTagManagement}
          title={`Manage Tags for ${tagManagementUser.name || tagManagementUser.email || 'User'}`}
        >
          <TagManagement
            entityType="user"
            entityId={tagManagementUser.id}
            entityName={tagManagementUser.name || tagManagementUser.email}
            currentTags={tagManagementUser.userTags || []}
            onTagsUpdated={handleTagsUpdated}
            showTitle={false}
            compact={false}
          />
        </Modal>
      )}
      
      {/* Delete Confirmation Modal with email verification */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete the user{" "}
                <span className="font-semibold">{userToDelete?.name || userToDelete?.email || 'Unknown'}</span>?
                This action cannot be undone.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      For extra security, please type the user's full email address to confirm deletion.
                    </p>
                  </div>
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type "{userToDelete?.email}" to confirm:
              </label>
              <input
                type="text"
                value={confirmUserEmail}
                onChange={(e) => setConfirmUserEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="User email"
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                  setConfirmUserEmail('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className={`px-4 py-2 text-white rounded ${
                  confirmUserEmail === userToDelete?.email
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-red-300 cursor-not-allowed'
                }`}
                disabled={isDeleting || confirmUserEmail !== userToDelete?.email}
              >
                {isDeleting ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Toaster richColors />
    </div>
  );
}

// Main component that wraps the content with Suspense
export default function AdminUsers() {
  return (
    <Suspense fallback={<div>Loading users...</div>}>
      <AdminUsersContent />
    </Suspense>
  );
}
