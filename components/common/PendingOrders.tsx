'use client';

import React, { useState, useEffect } from 'react';

interface ShopOrder {
  id: string;
  itemId: string;
  itemName: string;
  price: number;
  quantity: number;
  status: string;
  createdAt: string;
}

export default function PendingOrders() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/users/me/shop-orders');
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

    fetchOrders();
  }, []);

  // Filter to only show pending orders
  const pendingOrders = orders.filter(order => order.status === 'pending');

  if (loading) {
    return null; // Don't show loading state for this component
  }

  if (error) {
    return null; // Don't show error state for this component
  }

  if (pendingOrders.length === 0) {
    return null; // Don't show anything if no pending orders
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-yellow-600">⏳</span>
        <h3 className="font-semibold text-yellow-800">Pending Orders</h3>
      </div>
      <p className="text-sm text-yellow-700 mb-3">
        You have {pendingOrders.length} pending order{pendingOrders.length !== 1 ? 's' : ''} that will be processed soon.
      </p>
      <div className="space-y-2">
        {pendingOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-lg p-3 border border-yellow-300">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{order.itemName}</div>
                <div className="text-sm text-gray-600">
                  Qty: {order.quantity} • {order.price} shells
                </div>
              </div>
              <div className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                Pending
              </div>
            </div>
            {order.itemName.toLowerCase().includes('progress') && (
              <div className="text-xs text-gray-500 mt-1">
                Will add {order.quantity}% progress when fulfilled
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 