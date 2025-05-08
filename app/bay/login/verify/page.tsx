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
            <p className="text-gray-600 text-center mb-6">
              Please wait while we verify your email address...
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

      if (!token || !email) {
        setToastMessage('Invalid verification link');
        setToastType('error');
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify?token=${token}&email=${email}`);
        const data = await response.json();

        if (data.success) {
          setToastMessage('Email verified successfully! Signing you in...');
          setToastType('success');
          
          // Sign in the user
          const result = await signIn('email', {
            email,
            token,
            redirect: false,
          });

          if (result?.ok) {
            router.push('/bay');
          } else {
            setToastMessage('Failed to sign in after verification');
            setToastType('error');
          }
        } else {
          setToastMessage(data.message || 'Verification failed');
          setToastType('error');
        }
      } catch (error) {
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
          <p className="text-gray-600 text-center mb-6">
            Please wait while we verify your email address...
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