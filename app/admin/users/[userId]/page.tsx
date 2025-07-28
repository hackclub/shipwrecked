"use client"

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { calculateProgressMetrics, ProgressMetrics, getProjectHackatimeHours } from '@/lib/project-client';
import { ProjectType } from '@/app/api/projects/route';
import TagManagement from '@/components/common/TagManagement';

enum UserStatus {
  Unknown = "Unknown",
  L1 = "L1",
  L2 = "L2",
  FraudSuspect = "FraudSuspect"
}

enum UserRole {
  User = "User",
  Reviewer = "Reviewer",
  Admin = "Admin"
}

interface AdminProjectType extends ProjectType {
  rawHours: number;
  reviewCount: number;
  hackatimeName?: string;
  hackatimeLinks?: {
    id: string;
    hackatimeName: string;
    rawHours: number;
    hoursOverride?: number;
  }[];
}


interface UserTag {
  id: string;
  tagId: string;
  createdAt: string;
  tag: {
    id: string;
    name: string;
    description?: string;
    color?: string;
    createdAt: string;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  hackatimeId: string | null;
  slack: string | null;
  projects?: AdminProjectType[];
  userTags?: UserTag[];
  totalShellsSpent?: number;
  adminShellAdjustment?: number;
  purchasedProgressHours?: number;
}



export default function UserDetail({ params }: { params: { userId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [userRole, setUserRole] = useState<string>('User');
  const [userStatus, setUserStatus] = useState<UserStatus>(UserStatus.Unknown);



  useEffect(() => {
    async function fetchUser() {
      if (status !== 'authenticated') return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/admin/users/${params.userId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.statusText}`);
        }
        
        const data = await response.json();
        setUser(data);
        setUserRole(data.role || UserRole.User);
        setUserStatus(data.status);
      } catch (err) {
        console.error('Error fetching user:', err);
        toast.error('Failed to load user');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchUser();
  }, [params.userId, status]);



  const updateUser = async () => {
    if (!user) return;

    try {
      setIsUpdating(true);
      
      // Determine isAdmin value based on role
      const isAdminValue = userRole === UserRole.Admin;
      
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: userRole,
          isAdmin: isAdminValue, // Update both fields for compatibility
          status: userStatus
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      toast.success('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setIsUpdating(false);
    }
  };



  const refreshUserData = async () => {
    try {
      const userResponse = await fetch(`/api/admin/users/${params.userId}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Calculate progress metrics with admin adjustments
  const progressMetrics: ProgressMetrics = user?.projects ? calculateProgressMetrics(
    user.projects, 
    user.purchasedProgressHours || 0,
    user.totalShellsSpent || 0,
    user.adminShellAdjustment || 0
  ) : {
    shippedHours: 0,
    viralHours: 0,
    otherHours: 0,
    totalHours: 0,
    totalPercentage: 0,
    rawHours: 0,
    availableShells: 0,
    purchasedProgressHours: 0,
    totalProgressWithPurchased: 0,
    totalPercentageWithPurchased: 0
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-red-600 mb-2">User Not Found</h1>
        <p className="text-gray-600 mb-6">The requested user could not be found.</p>
        <Link 
          href="/admin/users"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Link 
            href="/admin/users"
            className="text-blue-600 hover:text-blue-800 mr-3"
          >
            ← Back to Users
          </Link>
          <h1 className="text-2xl font-bold">User Details</h1>
        </div>
        <Link 
          href={`/bay/${user.id}`}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View Bay
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center mb-6">
            {user.image ? (
              <img 
                src={user.image} 
                alt={user.name || 'User'} 
                className="w-20 h-20 rounded-full object-cover mr-4"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mr-4">
                <span className="text-gray-600 text-2xl font-bold">
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold">{user.name || 'Unknown'}</h2>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Account Created</p>
                  <p className="text-gray-700">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email Verification</p>
                  <div className="flex items-center">
                    <span 
                      className={`inline-block w-3 h-3 rounded-full mr-2 ${
                        user.emailVerified ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                    ></span>
                    <span>
                      {user.emailVerified ? 'Verified' : 'Not Verified'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">User Status</p>
                  <div className="flex items-center">
                    <span 
                      className={`inline-block w-3 h-3 rounded-full mr-2 ${
                        user.status === UserStatus.L2 ? 'bg-green-500' : 
                        user.status === UserStatus.L1 ? 'bg-blue-500' :
                        user.status === UserStatus.FraudSuspect ? 'bg-red-500' : 'bg-gray-400'
                      }`}
                    ></span>
                    <span>
                      {user.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Island Progress</h3>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-lg border border-blue-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {Math.round(progressMetrics.totalPercentageWithPurchased)}%
                  </div>
                  <div className="text-sm text-blue-800 mb-2">Progress to Island</div>
                  <div className="text-xs text-gray-600">
                    {progressMetrics.totalPercentageWithPurchased.toFixed(1)} / 60 hours • {user.projects?.length || 0} projects
                  </div>
                </div>
                <div className="mt-3 bg-white rounded-full p-1">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progressMetrics.totalPercentageWithPurchased, 100)}%` }}
                  ></div>
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-600">
                  <span>Shipped: {progressMetrics.shippedHours.toFixed(1)}h</span>
                  <span>Viral: {progressMetrics.viralHours.toFixed(1)}h</span>
                  <span>Purchased: {progressMetrics.purchasedProgressHours.toFixed(1)}h</span>
                  <span>Other: {progressMetrics.otherHours.toFixed(1)}h</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Connection Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Hackatime ID</p>
                  <p className="text-gray-700">
                    {user.hackatimeId || 'Not connected'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Slack</p>
                  <p className="text-gray-700">
                    {user.slack || 'Not connected'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      {user.projects && user.projects.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Projects ({user.projects.length})</h3>
            <div className="space-y-4">
              {user.projects.map((project) => {
                const rawHours = getProjectHackatimeHours(project);
                
                // Calculate approved hours using the same logic as calculateProgressMetrics
                let approvedHours = 0;
                if (project?.viral === true) {
                  approvedHours = 15;
                } else if (project?.shipped === true) {
                  approvedHours = Math.min(rawHours, 15);
                } else {
                  approvedHours = Math.min(rawHours, 14.75);
                }
                
                return (
                  <div key={project.projectID} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Link
                            href={`/admin/projects?projectId=${project.projectID}`}
                            className="text-lg font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {project.name}
                          </Link>
                          <div className="flex gap-1">
                            {project.viral && (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Viral
                              </span>
                            )}
                            {project.shipped && (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Shipped
                              </span>
                            )}
                            {project.in_review && (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                In Review
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">
                          {project.description || 'No description provided'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            <span className="font-medium text-blue-600">{approvedHours.toFixed(1)}h approved</span>
                            {Math.abs(rawHours - approvedHours) > 0.01 && (
                              <span className="text-gray-400"> ({rawHours.toFixed(1)}h raw)</span>
                            )}
                          </span>
                          {project.reviewCount > 0 && (
                            <span>{project.reviewCount} review{project.reviewCount !== 1 ? 's' : ''}</span>
                          )}
                          {project.hackatimeName && (
                            <span>Hackatime: {project.hackatimeName}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {project.codeUrl && (
                          <a
                            href={project.codeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Code
                          </a>
                        )}
                        {project.playableUrl && (
                          <a
                            href={project.playableUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            Demo
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Permissions Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Permissions</h3>
          
          <div className="mb-4">
            <label htmlFor="userRole" className="block text-sm font-medium text-gray-700 mb-1">
              User Role
            </label>
            <select
              id="userRole"
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="mt-1 pl-3 pr-10 py-2 text-base border-gray-300 bg-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md w-50"
            >
              <option value={UserRole.User}>User</option>
              <option value={UserRole.Reviewer}>Reviewer</option>
              <option value={UserRole.Admin}>Admin</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              This defines the user's access level. Reviewers can access the review page. Admins have full access to all platform features.
            </p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="userStatus" className="block text-sm font-medium text-gray-700 mb-1">
              User Status
            </label>
            <select
              id="userStatus"
              value={userStatus}
              onChange={(e) => setUserStatus(e.target.value as UserStatus)}
              className="mt-1 pl-3 pr-10 py-2 text-base border-gray-300 bg-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md w-50"
            >
              <option value={UserStatus.Unknown}>Unknown</option>
              <option value={UserStatus.L1}>L1</option>
              <option value={UserStatus.L2}>L2</option>
              <option value={UserStatus.FraudSuspect}>Fraud Suspect</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              This defines the user's grantability status.
            </p>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            User roles determine access to different parts of the platform:
            <br />• <strong>User:</strong> Basic access to the platform
            <br />• <strong>Reviewer:</strong> Can access the review dashboard to evaluate projects
            <br />• <strong>Admin:</strong> Full access to all features, including user management
          </p>
          
          <button
            type="button"
            onClick={updateUser}
            disabled={isUpdating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors focus:outline-none disabled:bg-blue-300"
          >
            {isUpdating ? 'Updating...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Shell Management Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Shell Balance Management</h3>
          
          {/* Current Shell Balance Breakdown */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-100 p-4 rounded-lg border border-yellow-200 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {user?.projects ? calculateProgressMetrics(user.projects, user.purchasedProgressHours || 0).availableShells : 0}
                </div>
                <div className="text-sm text-yellow-800">Earned Shells</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {(user?.totalShellsSpent || 0) > 0 ? `-${user.totalShellsSpent}` : '0'}
                </div>
                <div className="text-sm text-red-800">Spent Shells</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {user?.adminShellAdjustment ? (user.adminShellAdjustment > 0 ? '+' : '') + user.adminShellAdjustment : '0'}
                </div>
                <div className="text-sm text-blue-800">Admin Adjustment</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {progressMetrics.availableShells}
                </div>
                <div className="text-sm text-green-800">Available Shells</div>
              </div>
            </div>
          </div>

          {/* Shell Modification Form */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-md font-medium mb-3">Modify Shell Balance</h4>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const adjustment = parseInt(formData.get('adjustment') as string);
              const reason = formData.get('reason') as string;

              if (!adjustment || adjustment === 0) {
                toast.error('Please enter a non-zero adjustment amount');
                return;
              }

              try {
                const response = await fetch(`/api/admin/users/${user?.id}/shells`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    adjustment,
                    reason: reason.trim() || undefined,
                  }),
                });

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || 'Failed to modify shells');
                }

                const result = await response.json();
                toast.success(`Shell balance updated! Previous: ${result.previousBalance}, New: ${result.newBalance}`);
                
                // Refresh user data
                await refreshUserData();
                
                // Reset form
                (e.target as HTMLFormElement).reset();
              } catch (error) {
                console.error('Error modifying shells:', error);
                toast.error(error instanceof Error ? error.message : 'Failed to modify shells');
              }
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adjustment" className="block text-sm font-medium text-gray-700 mb-1">
                    Shell Adjustment
                  </label>
                  <input
                    type="number"
                    id="adjustment"
                    name="adjustment"
                    placeholder="e.g., 50 to add, -25 to deduct"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="-1000"
                    max="1000"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Positive numbers add shells, negative numbers deduct shells. Range: -1000 to +1000
                  </p>
                </div>
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    id="reason"
                    name="reason"
                    placeholder="e.g., Compensation for bug, Manual correction"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={200}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Optional reason that will be recorded in audit logs
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Update Shell Balance
                </button>
              </div>
            </form>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            <p><strong>⚠️ Important:</strong> All shell modifications are logged in the audit system and cannot be undone.</p>
            <p>The user's available shell balance will be updated immediately and reflected across the platform.</p>
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
        <div className="p-6">
          <TagManagement
            entityType="user"
            entityId={user?.id || ''}
            entityName={user?.name || undefined}
            currentTags={user?.userTags || []}
            onTagsUpdated={refreshUserData}
          />
        </div>
      </div>


      
      <Toaster richColors />
    </div>
  );
}