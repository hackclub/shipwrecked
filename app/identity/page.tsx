"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function IdentityCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading'|'success'|'error'|'pending'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setStatus('error');
      setMessage('No authorization code found in the URL.');
      return;
    }

    async function exchangeCode() {
      setStatus('loading');
      try {
        const response = await fetch('/api/identity/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const data = await response.json();
        console.log(data);
        if (data.access_token) {
            const response2 = await fetch('/api/identity/me');
            const data2 = await response2.json();
            console.log(data2);
          
          if (data2.rejection_reason) {
            setStatus('error');
            setMessage('Your submission got rejected! Go to identity.hackclub.com to fix.');
            return;
          }
          
          if (data2.verification_status === 'pending') {
            setStatus('pending');
            setMessage('Your identity verification is pending. Please wait for approval.');
            return;
          }
          
          setStatus(data2.verification_status === 'verified' ? 'success' :  'error');
          setMessage(data2.verification_status === 'verified' ? 'Identity verified! You may now return to Shipwrecked.' : 'Identity verification failed. Please try again.');
        } else {
          setStatus('error');
          setMessage('Failed to verify identity.');
        }
      } catch {
        setStatus('error');
        setMessage('Failed to verify identity. Please try again.');
      }
    }
    exchangeCode();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Identity Verification</h1>
        {status === 'loading' && <p className="mb-4">Verifying your identity...</p>}
        {status === 'success' && <p className="mb-4 text-green-600">{message}</p>}
        {status === 'pending' && <p className="mb-4 text-yellow-600">{message}</p>}
        {status === 'error' && (
          <p className="mb-4 text-red-600">
            {message.includes('identity.hackclub.com') ? (
              <>
                Your submission got rejected! Go to{' '}
                <a 
                  href="https://identity.hackclub.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-red-800"
                >
                  identity.hackclub.com
                </a>{' '}
                to fix.
              </>
            ) : (
              message
            )}
          </p>
        )}
        <button
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => router.push('/bay')}
        >
          Return to Shipwrecked
        </button>
      </div>
    </div>
  );
}

export default function IdentityCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded shadow max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Identity Verification</h1>
          <p className="mb-4">Loading...</p>
        </div>
      </div>
    }>
      <IdentityCallbackContent />
    </Suspense>
  );
} 
