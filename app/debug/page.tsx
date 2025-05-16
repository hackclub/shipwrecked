'use client';

import { useState } from 'react';

export default function DebugPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testProjectCreation = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/debug/create-project', {
        method: 'POST',
      });
      
      const data = await response.json();
      setResult(data);
      
      if (!response.ok) {
        setError(`Error ${response.status}: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const testHealthCheck = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setResult(data);
      
      if (!response.ok) {
        setError(`Error ${response.status}: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseDiagnostic = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/debug/database');
      const data = await response.json();
      setResult(data);
      
      if (!response.ok) {
        setError(`Error ${response.status}: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testDirectCreation = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/debug/direct-create', {
        method: 'POST',
      });
      
      const data = await response.json();
      setResult(data);
      
      if (!response.ok) {
        setError(`Error ${response.status}: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Debug Page</h1>
      
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={testProjectCreation}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Test Project Creation'}
        </button>
        
        <button
          onClick={testHealthCheck}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Test Health Check'}
        </button>

        <button
          onClick={testDatabaseDiagnostic}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Full Database Diagnostic'}
        </button>

        <button
          onClick={testDirectCreation}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Direct Project Creation'}
        </button>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 