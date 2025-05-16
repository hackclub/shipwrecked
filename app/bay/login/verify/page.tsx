'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Toast from '@/components/common/Toast';

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-[url(/bay.webp)] bg-cover bg-center">
        <div className="flex items-center justify-center h-full">
          <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl p-8 border border-gray-200 max-w-md w-full mx-4">
            <h1 className="text-3xl font-bold text-center mb-4 text-gray-800">Verifying Email</h1>
            <p className="text-gray-600 text-center mb-4">
              Please check your email for a verification link.
            </p>
            <p className="text-gray-600 text-center mb-6">
              <strong>Important:</strong> Be sure to check your spam or junk folder if you don't see the email in your inbox.
            </p>
          </div>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('error');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const email = searchParams.get('email');

      // It is expected for this to be called once with no token or email - we will hit the flow below after user clicks the link in the email
      if (!token || !email) {
        return;
      }

      try {
        console.log('Verifying email with token and email:', { tokenLength: token.length, email });
        
        const response = await fetch(`/api/auth/verify?token=${token}&email=${email}`);
        console.log('Verification API response status:', response.status);
        const data = await response.json();
        console.log('Verification API response:', data);

        if (data.success) {
          console.log('Verification successful, attempting sign in');
          setToastMessage('Email verified successfully! Signing you in...');
          setToastType('success');
          
          // Sign in the user
          console.log('Calling NextAuth signIn with email provider...');
          const result = await signIn('email', {
            email,
            token,
            redirect: false,
          });
          console.log('SignIn result details:', { 
            ok: result?.ok, 
            error: result?.error,
            url: result?.url,
            status: result?.status
          });

          if (result?.ok) {
            console.log('SignIn successful, redirecting to /bay');
            // Wait a moment for session to be established
            setTimeout(() => {
              router.push('/bay');
            }, 1000);
          } else {
            console.error('SignIn failed:', result?.error);
            setToastMessage('Failed to sign in after verification');
            setToastType('error');
          }
        } else {
          console.error('Verification failed:', data.message);
          setToastMessage(data.message || 'Verification failed');
          setToastType('error');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setToastMessage('An error occurred during verification');
        setToastType('error');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="fixed inset-0 bg-[url(/bay.webp)] bg-cover bg-center">
      <div className="flex items-center justify-center h-full">
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl p-8 border border-gray-200 max-w-md w-full mx-4">
          <h1 className="text-3xl font-bold text-center mb-4 text-gray-800">Verifying Email</h1>
          <p className="text-gray-600 text-center mb-4">
            Please check your email for a verification link.
          </p>
          <p className="text-gray-600 text-center mb-6">
            <strong>Important:</strong> Be sure to check your spam or junk folder if you don't see the email in your inbox.
          </p>
          {toastMessage && (
            <Toast
              message={toastMessage}
              type={toastType}
              onClose={() => setToastMessage(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
} 