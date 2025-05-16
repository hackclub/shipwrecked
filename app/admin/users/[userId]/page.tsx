"use client"

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';

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
      <div className="mb-6 flex items-center">
        <Link 
          href="/admin/users"
          className="text-blue-600 hover:text-blue-800 mr-3"
        >
          ← Back to Users
        </Link>
        <h1 className="text-2xl font-bold">User Details</h1>
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
              <h3 className="text-lg font-medium mb-2">Additional Information</h3>
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
                    {user.slack ? (
                      <a 
                        href={`https://hackclub.slack.com/app_redirect?channel=${user.slack}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Direct message...
                      </a>
                    ) : (
                      'Unknown'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Permissions</h3>
            
            <div className="mb-4">
              <label htmlFor="userRole" className="block text-sm font-medium text-gray-700 mb-1">
                User Role
              </label>
              <select
                id="userRole"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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
      </div>
      <Toaster richColors />
    </div>
  );
} 