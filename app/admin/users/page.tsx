"use client"

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';

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
}

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Administrate Users</h1>
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
                              {user.name || 'Unknown'}
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
                          user.role === 'Admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : user.role === 'Reviewer'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
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
                          onClick={() => openDeleteModal(user)}
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
                  <div 
                    key={user.id}
                    className="block bg-white rounded-lg shadow-md overflow-hidden"
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
                            {user.name || 'Unknown'}
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