'use client';

import styles from '../page.module.css';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Toaster, toast } from "sonner";

function Loading() {
  return (
    <div className="fixed inset-0 bg-[url(/bay.webp)] bg-cover bg-center">
      <div className="relative flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-5xl md:text-6xl font-serif mb-6 text-white font-bold">
            Loading...
          </p>
        </div>
      </div>
    </div>
  )
}

function AccessDeniedHaiku() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Start fade-in after mount
    const fadeTimer = setTimeout(() => setVisible(true), 10);
    // Redirect after 5 seconds
    const redirectTimer = setTimeout(() => {
      router.push('/bay/login');
    }, 5000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <div className="fixed inset-0 bg-[url(/bay.webp)] bg-cover bg-center">
      <div className="relative flex items-center justify-center h-full">
        <div
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 4s ease-in',
            display: 'inline-block'
          }}
          className="text-center"
        >
          <p className="text-5xl md:text-6xl font-serif mb-6 text-white font-bold">
            Stranded on the shore,
          </p>
          <p className="text-5xl md:text-6xl font-serif mb-6 text-white font-bold">
            Treasure lies beyond the waves,
          </p>
          <p className="text-5xl md:text-6xl font-serif text-white font-bold">
            Sign in to set sail.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);

  // Early return if not authenticated
  if (status === "loading") return <Loading />
  if (status === "unauthenticated") {
    return <AccessDeniedHaiku />;
  }

  const handleSaveSettings = () => {
    // In a real implementation, you would save these settings to a database
    toast.success("Settings saved successfully!");
  };

  // Function to trigger email verification
  const handleRequestVerification = async () => {
    if (!session?.user?.email) {
      toast.error("No email associated with your account");
      return;
    }

    setIsRequestingVerification(true);
    
    try {
      // Using the same email sign-in flow as the login page
      await signIn("email", { 
        email: session.user.email, 
        redirect: false 
      });
      
      toast.success("Verification email sent! Please check your inbox.");
      
      // Redirect to verification page
      router.push("/bay/login/verify");
    } catch (error) {
      console.error("Error requesting verification:", error);
      toast.error("Failed to send verification email. Please try again.");
    } finally {
      setIsRequestingVerification(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Settings</h1>
        
        <div className="space-y-8">
          <div className="pb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Account Settings</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 mb-1">Email</p>
                <p className="font-medium">{session?.user?.email}</p>
              </div>
              
              <div>
                <p className="text-gray-600 mb-1">Name</p>
                <p className="font-medium">{session?.user?.name || "Not set"}</p>
              </div>
              
              <div>
                <p className="text-gray-600 mb-1">Email Verified?</p>
                <div className="flex items-center">
                  {session?.user?.emailVerified ? (
                    <span className="px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Yes
                    </span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        No
                      </span>
                      <button
                        onClick={handleRequestVerification}
                        disabled={isRequestingVerification}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium underline transition-colors"
                      >
                        {isRequestingVerification ? "Sending..." : "Fix this..."}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
      <Toaster richColors />
    </div>
  );
} 