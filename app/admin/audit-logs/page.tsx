"use client"

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';

// Enum for audit log event types (matching Prisma schema)
enum AuditLogEventType {
  ProjectCreated = "ProjectCreated",
  ProjectSubmittedForReview = "ProjectSubmittedForReview",
  ProjectMarkedShipped = "ProjectMarkedShipped",
  ProjectMarkedViral = "ProjectMarkedViral",
  ProjectReviewCompleted = "ProjectReviewCompleted",
  UserRoleChanged = "UserRoleChanged",
  UserVerified = "UserVerified",
  UserCreated = "UserCreated",
  ProjectDeleted = "ProjectDeleted",
  SlackConnected = "SlackConnected",
  OtherEvent = "OtherEvent"
}

// Audit log interface
interface AuditLog {
  id: string;
  eventType: AuditLogEventType;
  description: string;
  createdAt: string;
  metadata?: any;
  targetUserId: string;
  targetUser: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  actorUserId?: string;
  actorUser?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  projectId?: string;
  project?: {
    projectID: string;
    name: string;
  };
}

// Pagination interface
interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

// User interface for filtering
interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export default function AuditLogsPage() {
  const { data: session, status } = useSession();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: 25,
    offset: 0
  });
  const [filters, setFilters] = useState({
    eventType: '',
    userId: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch audit logs based on current filters and pagination
  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      // Fetch audit logs with filters and pagination
      const response = await fetch(
        `/api/admin/audit-logs?${new URLSearchParams({
          ...(filters.eventType ? { eventType: filters.eventType } : {}),
          ...(filters.userId ? { userId: filters.userId } : {}),
          limit: String(pagination.limit),
          offset: String(pagination.offset)
        })}`
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch audit logs');
      }
      
      // Check if data has logs or auditLogs property
      const logsData = data.logs || data.auditLogs || [];
      setAuditLogs(logsData);
      
      // Check if data has total or pagination property
      const totalCount = data.total || (data.pagination && data.pagination.total) || 0;
      setPagination(prev => ({ ...prev, total: totalCount }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to fetch audit logs: ${errorMessage}`);
      console.error('Error fetching audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users for filter dropdown
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Handle pagination
  const handlePageChange = (newOffset: number) => {
    setPagination(prev => ({
      ...prev,
      offset: newOffset
    }));
  };

  // Handle filter changes
  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    // Reset pagination when filters change
    setPagination(prev => ({
      ...prev,
      offset: 0
    }));
  };

  // Load data on initial render and when filters/pagination change
  useEffect(() => {
    if (status === 'authenticated') {
      fetchAuditLogs();
      fetchUsers();
    }
  }, [status, filters, pagination.offset, pagination.limit]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get event type badge
  const getEventTypeBadge = (eventType: AuditLogEventType) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    
    switch(eventType) {
      case AuditLogEventType.ProjectCreated:
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case AuditLogEventType.ProjectDeleted:
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
      case AuditLogEventType.ProjectSubmittedForReview:
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case AuditLogEventType.ProjectMarkedShipped:
      case AuditLogEventType.ProjectMarkedViral:
        bgColor = 'bg-purple-100';
        textColor = 'text-purple-800';
        break;
      case AuditLogEventType.UserCreated:
        bgColor = 'bg-emerald-100';
        textColor = 'text-emerald-800';
        break;
      case AuditLogEventType.UserRoleChanged:
        bgColor = 'bg-amber-100';
        textColor = 'text-amber-800';
        break;
      case AuditLogEventType.UserVerified:
      case AuditLogEventType.SlackConnected:
        bgColor = 'bg-indigo-100';
        textColor = 'text-indigo-800';
        break;
      default:
        // Keep default gray
        break;
    }
    
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>
        {eventType === AuditLogEventType.UserVerified 
          ? 'Email Verified' 
          : eventType.replace(/([A-Z])/g, ' $1').trim()}
      </span>
    );
  };

  // Display user avatar and name
  const UserDisplay = ({ user }: { user: User | undefined }) => {
    if (!user) return <span className="text-gray-500">System</span>;
    
    return (
      <div className="flex items-center">
        {user.image ? (
          <img className="h-6 w-6 rounded-full mr-2" src={user.image} alt={user.name || 'User'} />
        ) : (
          <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center mr-2">
            <span className="text-xs text-gray-600 font-bold">{(user.name || user.email || 'U').charAt(0).toUpperCase()}</span>
          </div>
        )}
        <span>{user.name || user.email || 'Unknown'}</span>
      </div>
    );
  };

  // If not authenticated, show access denied
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

  // Calculate pagination values
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const startItem = pagination.offset + 1;
  const endItem = Math.min(pagination.offset + pagination.limit, pagination.total);

  return (
    <div>
      <Toaster position="top-right" />
      
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-gray-600">View system activity and changes across the platform</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAuditLogs}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
          <select
            id="eventType"
            value={filters.eventType}
            onChange={(e) => handleFilterChange('eventType', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Events</option>
            {Object.values(AuditLogEventType).map((type) => (
              <option key={type} value={type}>
                {type.replace(/([A-Z])/g, ' $1').trim()}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">User</label>
          <select
            id="userId"
            value={filters.userId}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email || 'Unknown'}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-end">
          <button
            onClick={() => {
              setFilters({ eventType: '', userId: '' });
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Reset Filters
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Audit Logs Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th scope="col" className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Target User
                    </th>
                    <th scope="col" className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Actor
                    </th>
                    <th scope="col" className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 sm:px-6 py-4 text-center text-gray-500">
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          {getEventTypeBadge(log.eventType)}
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 text-sm">
                          <div className="text-sm text-gray-900">{log.description}</div>
                          
                          {/* Mobile-only: Show user info inline on mobile */}
                          <div className="sm:hidden mt-1">
                            <div className="text-xs text-gray-600">
                              <div className="flex items-center mt-1">
                                <span className="font-medium">User:</span>
                                <span className="ml-1">
                                  {log.targetUser?.name || log.targetUser?.email || 'Unknown'}
                                </span>
                              </div>
                              
                              {log.actorUser && (
                                <div className="flex items-center mt-1">
                                  <span className="font-medium">By:</span>
                                  <span className="ml-1">
                                    {log.actorUser?.name || log.actorUser?.email || 'System'}
                                  </span>
                                </div>
                              )}
                              
                              <div className="mt-1 text-xs text-gray-500">
                                {formatTimestamp(log.createdAt)}
                              </div>
                            </div>
                          </div>
                          
                          {log.project && (
                            <div className="text-xs text-gray-500">
                              {log.eventType !== AuditLogEventType.ProjectCreated && (
                                <div>Project: <Link href={`/admin/projects/${log.project.projectID}`} className="text-blue-600 hover:underline">{log.project.name}</Link></div>
                              )}
                              
                              {/* Show additional project details for ProjectCreated event */}
                              {log.eventType === AuditLogEventType.ProjectCreated && log.metadata?.projectDetails && (
                                <div className="mt-1">
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {log.metadata.projectDetails.url && (
                                      <Link 
                                        href={log.metadata.projectDetails.url} 
                                        className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100"
                                        target="_blank"
                                      >
                                        View Project
                                      </Link>
                                    )}
                                    {log.metadata.projectDetails.codeUrl && (
                                      <Link 
                                        href={log.metadata.projectDetails.codeUrl} 
                                        className="inline-flex items-center px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs hover:bg-gray-100"
                                        target="_blank"
                                      >
                                        Code
                                      </Link>
                                    )}
                                    {log.metadata.projectDetails.playableUrl && (
                                      <Link 
                                        href={log.metadata.projectDetails.playableUrl} 
                                        className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100"
                                        target="_blank"
                                      >
                                        Play
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                          <UserDisplay user={log.targetUser} />
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                          <UserDisplay user={log.actorUser} />
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                          {formatTimestamp(log.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination */}
          {auditLogs.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{startItem}</span> to{' '}
                <span className="font-medium">{endItem}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> results
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(Math.max(0, pagination.offset - pagination.limit))}
                  disabled={pagination.offset === 0}
                  className={`px-3 py-1 border rounded ${
                    pagination.offset === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                
                <button
                  onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                  disabled={endItem >= pagination.total}
                  className={`px-3 py-1 border rounded ${
                    endItem >= pagination.total
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 