'use client';

import React, { useState, useEffect } from 'react';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  image?: string;
  price: number;
  
}

interface ShellBalance {
  shells: number;
  earnedShells: number;
  totalSpent: number;
  availableShells: number;
}

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userShells, setUserShells] = useState<ShellBalance | null>(null);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch shop items
        const itemsResponse = await fetch('/api/bay/shop/items');
        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json();
          setItems(itemsData.items);
        }

        // Fetch user shells
        const shellsResponse = await fetch('/api/users/me/shells');
        if (shellsResponse.ok) {
          const shellsData = await shellsResponse.json();
          setUserShells(shellsData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePurchase = async () => {
    if (!selectedItem) return;

    setIsPurchasing(true);
    setError(null);

    try {
      const response = await fetch('/api/bay/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItem.id,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Purchase failed');
      }

      // Close modal and show success
      setSelectedItem(null);
      setQuantity(1);
      
      // Show success message
      setSuccessMessage(`Successfully purchased ${quantity}x ${selectedItem.name}!`);
      setShowSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage('');
      }, 3000);
      
      // Refresh shell balance
      const shellsResponse = await fetch('/api/users/me/shells');
      if (shellsResponse.ok) {
        const shellsData = await shellsResponse.json();
        setUserShells(shellsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading the Shell Shop...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error: {error}</h2>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <span className="text-xl">✅</span>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <img src="/shell_720.png" alt="Shell" className="w-12 h-12 mr-3" />
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Shell Shop</h1>
            </div>
            <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
              Exchanged your shells for some rewards. Prices are subject to change. 👀
            </p>
            
            {/* Shell Balance Display */}
            {userShells !== null && (
              <div className="inline-flex items-center bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-full px-6 py-3 shadow-sm">
                <img src="/shell_720.png" alt="Shell" className="w-5 h-5 mr-2" />
                <span className="text-xl font-bold text-blue-900">{userShells.shells}</span>
                <span className="ml-2 text-blue-700 font-medium">available</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shop Items */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.sort((a, b) => a.price - b.price).map((item) => (
            <div
              key={item.id}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden"
            >
              {/* Item Image */}
              <div className="h-48 bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center p-2">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="object-contain w-full h-full"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🏆</span>
                  </div>
                )}
              </div>

              {/* Item Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">{item.description}</p>
                
                {/* Price */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <img src="/shell_720.png" alt="Shell" className="w-6 h-6 mr-2" />
                    <span className="text-2xl font-bold text-blue-600">{item.price}</span>
                    <span className="text-gray-500 ml-1">shells</span>
                  </div>
                  
                  {/* Check if user can afford */}
                  {userShells !== null && (
                    <div className={`text-sm px-2 py-1 rounded-full ${
                      userShells.shells >= item.price 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {userShells.shells >= item.price ? 'Can afford' : 'Not enough shells'}
                    </div>
                  )}
                </div>

                {/* Buy Button */}
                <button
                  onClick={() => setSelectedItem(item)}
                  disabled={userShells !== null && userShells.shells < item.price}
                  className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                    userShells !== null && userShells.shells < item.price
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transform hover:scale-105'
                  }`}
                >
                  {userShells !== null && userShells.shells < item.price ? 'Not enough shells' : 'Buy Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase Confirmation Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-20 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl transform transition-all border border-gray-200">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Purchase</h2>
              <p className="text-gray-600 mb-3">
                Are you sure you want to purchase <strong>{selectedItem.name}</strong>?
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h4 className="font-medium text-blue-900 mb-2">Item Description:</h4>
                <p className="text-blue-800 text-sm">{selectedItem.description}</p>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <span className="text-yellow-600 text-lg mr-2">⚠️</span>
                <p className="text-yellow-800 text-sm">
                  This is a one-way operation. Your shells will be deducted immediately.
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity:</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Total:</span>
                <div className="flex items-center">
                  <img src="/shell_720.png" alt="Shell" className="w-5 h-5 mr-1" />
                  <span className="text-xl font-bold text-blue-600">{selectedItem.price * quantity}</span>
                  <span className="text-gray-500 ml-1">shells</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setQuantity(1);
                  setError(null);
                }}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                disabled={isPurchasing}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold text-white transition ${
                  isPurchasing 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                }`}
              >
                {isPurchasing ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
