"use client"

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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
  status: UserStatus;
}

// Create a wrapper component that uses Suspense
function AdminUsersContent() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/admin/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
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

  const filteredUsers = users.filter(user => 
    (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
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
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Verified?
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.image ? (
                            <img className="h-10 w-10 rounded-full mr-3" src={user.image} alt={user.name || 'User'} />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                              <span className="text-gray-600 font-bold">{(user.name || user.email || 'U').charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || 'Unnamed User'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getUserStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.isAdmin 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.isAdmin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.emailVerified 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.emailVerified ? 'Verified' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </Link>
                        <button
                          className="text-red-600 hover:text-red-900"
                          // This would need proper implementation with confirmation
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this user?')) {
                              // Implement delete functionality
                              alert('Delete functionality to be implemented');
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredUsers.map((user) => (
                  <Link 
                    href={`/admin/users/${user.id}`}
                    key={user.id}
                    className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-center mb-3">
                        {user.image ? (
                          <img className="h-12 w-12 rounded-full mr-3" src={user.image} alt={user.name || 'User'} />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                            <span className="text-gray-600 font-bold">{(user.name || user.email || 'U').charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div>
                          <div className="text-base font-medium text-gray-900">
                            {user.name || 'Unnamed User'}
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
                          <span className="text-gray-500 block">Role</span>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.isAdmin 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.isAdmin ? 'Admin' : 'User'}
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
                      </div>
                      
                      <div className="mt-4 border-t border-gray-100 pt-3 text-right">
                        <span className="text-blue-600 font-medium">
                          Edit User →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
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