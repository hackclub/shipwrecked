'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

interface ShopOrder {
  id: string;
  itemId: string;
  itemName: string;
  price: number;
  quantity: number;
  status: string;
  createdAt: string;
  config?: {
    hours_equal_to_one_percent_progress?: number;
    dollars_per_hour?: number;
    percent?: number;
    hours?: number;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function ShopOrdersPage() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const { data: session, status } = useSession();
  const [isShopAdmin, setIsShopAdmin] = useState(false);
  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationOrder, setConfirmationOrder] = useState<ShopOrder | null>(null);
  const [confirmationAction, setConfirmationAction] = useState<'fulfill' | 'reject' | 'refund' | null>(null);

  const fetchOrders = async (filter?: string) => {
    try {
      const url = filter ? `/api/admin/shop-orders?status=${filter}` : '/api/admin/shop-orders';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on status and priority
  const getFilteredOrders = () => {
    let filtered = orders;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filter by priority
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(order => {
        if (priorityFilter === 'priority') {
          // Priority items are progress_to_island and travel_stipend
          return order.itemId === 'progress_to_island' || order.itemId === 'travel_stipend';
        } else if (priorityFilter === 'progress') {
          return order.itemId === 'progress_to_island';
        } else if (priorityFilter === 'stipend') {
          return order.itemId === 'travel_stipend';
        }
        return true;
      });
    }

    return filtered;
  };

  const showConfirmationDialog = (order: ShopOrder, action: 'fulfill' | 'reject' | 'refund') => {
    setConfirmationOrder(order);
    setConfirmationAction(action);
    setShowConfirmation(true);
  };

  const hideConfirmationDialog = () => {
    setShowConfirmation(false);
    setConfirmationOrder(null);
    setConfirmationAction(null);
  };

  const confirmAction = async () => {
    if (!confirmationOrder || !confirmationAction) return;
    
    hideConfirmationDialog();
    let status = 'pending';
    if (confirmationAction === 'fulfill') status = 'fulfilled';
    else if (confirmationAction === 'reject') status = 'rejected';
    else if (confirmationAction === 'refund') status = 'refunded';
    
    await updateOrderStatus(confirmationOrder.id, status);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdatingOrder(orderId);
    try {
      const response = await fetch('/api/admin/shop-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      const data = await response.json();

      // Show success message for rejections (shell reimbursement)
      if (status === 'rejected' && data.shellsReimbursed) {
        setSuccessMessage(`${data.shellsReimbursed} shells have been reimbursed to the user.`);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setSuccessMessage('');
        }, 5000);
      }

      // Show success message for fulfillments (progress applied)
      if (status === 'fulfilled' && data.progressApplied) {
        setSuccessMessage(`Order fulfilled! ${data.progressApplied} hours of progress applied to user.`);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setSuccessMessage('');
        }, 5000);
      }

      // Show success message for refunds
      if (status === 'refunded') {
        let message = `Order refunded! ${data.shellsReimbursed} shells have been reimbursed to the user.`;
        if (data.progressRemoved) {
          message += ` ${data.progressRemoved} hours of progress have been removed.`;
        }
        setSuccessMessage(message);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setSuccessMessage('');
        }, 5000);
      }

      // Refresh the orders list to show updated status
      fetchOrders(statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setUpdatingOrder(null);
    }
  };

  useEffect(() => {
    fetchOrders(statusFilter);
  }, [statusFilter]);

  // Fetch shop admin status
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/users/me').then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setIsShopAdmin(!!data.isShopAdmin);
        }
      });
    }
  }, [status]);

  const filteredOrders = getFilteredOrders();

  if (status === 'unauthenticated' || session?.user?.role !== 'Admin' || !isShopAdmin) {
    return <div>Access denied. Only authorized shop administrators can access this page.</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading shop orders...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error: {error}</h2>
          <button 
            onClick={() => fetchOrders(statusFilter)} 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <span className="text-xl">💰</span>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && confirmationOrder && confirmationAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                confirmationAction === 'fulfill' ? 'bg-green-100' : 
                confirmationAction === 'reject' ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                <span className="text-xl">
                  {confirmationAction === 'fulfill' ? '✅' : 
                   confirmationAction === 'reject' ? '❌' : '💰'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm {confirmationAction === 'fulfill' ? 'Fulfillment' : 
                         confirmationAction === 'reject' ? 'Rejection' : 'Refund'}
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to{' '}
              <span className="font-semibold">
                {confirmationAction === 'fulfill' ? 'fulfill' : 
                 confirmationAction === 'reject' ? 'reject' : 'refund'}
              </span>{' '}
              this order?
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Order Details:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div><span className="font-medium">Item:</span> {confirmationOrder.itemName}</div>
                <div><span className="font-medium">Customer:</span> {confirmationOrder.user.name} ({confirmationOrder.user.email})</div>
                <div><span className="font-medium">Quantity:</span> {confirmationOrder.quantity}</div>
                <div><span className="font-medium">Price:</span> {confirmationOrder.price} shells</div>
                {confirmationAction === 'fulfill' && confirmationOrder.itemName.toLowerCase().includes('progress') && (
                  <div><span className="font-medium">Progress to apply:</span> {confirmationOrder.quantity}%</div>
                )}
                {confirmationAction === 'reject' && (
                  <div><span className="font-medium">Shells to reimburse:</span> {confirmationOrder.price}</div>
                )}
                {confirmationAction === 'refund' && (
                  <>
                    <div><span className="font-medium">Shells to reimburse:</span> {confirmationOrder.price}</div>
                    {confirmationOrder.itemName.toLowerCase().includes('progress') && (
                      <div><span className="font-medium">Progress to remove:</span> {confirmationOrder.quantity}%</div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={hideConfirmationDialog}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition ${
                  confirmationAction === 'fulfill' ? 'bg-green-600 hover:bg-green-700' : 
                  confirmationAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {confirmationAction === 'fulfill' ? 'Fulfill Order' : 
                 confirmationAction === 'reject' ? 'Reject Order' : 'Refund Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shop Orders</h1>
              <p className="text-lg text-gray-600 mt-2">
                Manage and fulfill shop orders from users
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                    Status:
                  </label>
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="rejected">Rejected</option>
                    <option value="refunded">Refunded</option>
                    <option value="all">All Orders</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="priority-filter" className="text-sm font-medium text-gray-700">
                    Priority:
                  </label>
                  <select
                    id="priority-filter"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Items</option>
                    <option value="priority">Priority Items</option>
                    <option value="progress">Progress Only</option>
                    <option value="stipend">Stipend Only</option>
                  </select>
                </div>
              </div>
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-medium">
                {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📦</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {statusFilter === 'pending' && priorityFilter === 'all' ? 'All caught up!' : 'No orders found'}
            </h2>
            <p className="text-gray-600">
              {statusFilter === 'pending' && priorityFilter === 'all'
                ? 'No pending orders to process.' 
                : `No ${statusFilter !== 'all' ? statusFilter : ''} ${priorityFilter !== 'all' ? priorityFilter : ''} orders found.`
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${
                  (order.itemId === 'progress_to_island' || order.itemId === 'travel_stipend') 
                    ? 'border-orange-300 bg-orange-50' 
                    : 'border-gray-200'
                }`}
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    {/* Order Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">{order.itemName}</h3>
                            {(order.itemId === 'progress_to_island' || order.itemId === 'travel_stipend') && (
                              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                                Priority
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <img src="/shell_720.png" alt="Shell" className="w-4 h-4 mr-1" />
                              {Math.ceil(order.price / order.quantity)} shells each
                            </span>
                            <span>Qty: {order.quantity}</span>
                            <span>Total: {order.price} shells</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </div>
                          <div className={`mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : order.status === 'fulfilled' 
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'refunded'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </div>
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Customer Information</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Name:</span>
                            <span className="ml-2 font-medium text-gray-900">{order.user.name}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Email:</span>
                            <span className="ml-2 font-medium text-gray-900">{order.user.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons - Show different buttons based on order status */}
                    {order.status === 'pending' && (
                      <div className="flex flex-col gap-3 lg:w-48">
                        <button
                          onClick={() => showConfirmationDialog(order, 'fulfill')}
                          disabled={updatingOrder === order.id}
                          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                            updatingOrder === order.id
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 hover:shadow-md'
                          }`}
                        >
                          {updatingOrder === order.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <span>✅</span>
                              Mark Fulfilled
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => showConfirmationDialog(order, 'reject')}
                          disabled={updatingOrder === order.id}
                          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                            updatingOrder === order.id
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-700 hover:shadow-md'
                          }`}
                        >
                          {updatingOrder === order.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <span>❌</span>
                              Reject Order
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Refund Button - Only show for fulfilled orders */}
                    {order.status === 'fulfilled' && (
                      <div className="flex flex-col gap-3 lg:w-48">
                        <button
                          onClick={() => showConfirmationDialog(order, 'refund')}
                          disabled={updatingOrder === order.id}
                          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                            updatingOrder === order.id
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-yellow-600 hover:bg-yellow-700 hover:shadow-md'
                          }`}
                        >
                          {updatingOrder === order.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <span>💰</span>
                              Refund Order
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 