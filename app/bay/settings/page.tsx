'use client';

import styles from '../page.module.css';
import { useSession, signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
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

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  slack: string | null;
  isAdmin: boolean;
}

// Content component that will be wrapped in Suspense
function SettingsContent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);
  const [isConnectingSlack, setIsConnectingSlack] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch fresh user data directly from the server
  useEffect(() => {
    const fetchUserData = async () => {
      if (status !== 'authenticated' || !session?.user?.id) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/users/me`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const data = await response.json();
        setUserData(data);
        console.log('Fetched user data:', data); // Debug log
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (status === 'authenticated') {
      fetchUserData();
    }
  }, [status, session]);

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

  // Function to connect Slack
  const handleConnectSlack = async () => {
    setIsConnectingSlack(true);
    try {
      // Use the Slack provider for authentication with a query param to identify return from Slack
      // Create a full absolute URL to ensure proper redirection
      const callbackUrl = new URL("/bay/settings", window.location.origin);
      callbackUrl.searchParams.set("slackConnected", "true");
      
      await signIn("slack", { 
        callbackUrl: callbackUrl.toString(),
        redirect: true
      });
      // Note: We don't reset isConnectingSlack here because we're redirecting away
    } catch (error) {
      console.error("Error connecting to Slack:", error);
      toast.error("Failed to connect to Slack. Please try again.");
      setIsConnectingSlack(false);
    }
  };

  // Determine which data to use - prefer directly fetched userData if available
  const userEmail = userData?.email || session?.user?.email;
  const userName = userData?.name || session?.user?.name;
  const userEmailVerified = userData?.emailVerified || session?.user?.emailVerified;
  const userSlack = userData?.slack || session?.user?.slack;

  return (
    <div className={styles.container}>
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Settings</h1>
        
        <div className="space-y-8">
          <div className="pb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Account Settings</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 mb-1">Name</p>
                <p className="font-medium">{userName || "Unknown"}</p>
              </div>
              
              <div>
                <p className="text-gray-600 mb-1">Email</p>
                <p className="font-medium">{userEmail}</p>
              </div>
              
              <div>
                <p className="text-gray-600 mb-1">Email Verified?</p>
                <div className="flex items-center">
                  {userEmailVerified ? (
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
              
              <div>
                <p className="text-gray-600 mb-1">Slack Connected?</p>
                <div className="flex items-center">
                  {userSlack ? (
                    <span className="px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Yes
                    </span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        No
                      </span>
                      <button
                        onClick={handleConnectSlack}
                        disabled={isConnectingSlack}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium underline transition-colors"
                      >
                        {isConnectingSlack ? "Connecting..." : "Fix this..."}
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

// Component that handles useSearchParams with Suspense
function SettingsWithSearchParams() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  
  // Import useSearchParams in component that's wrapped in Suspense
  const { useSearchParams } = require('next/navigation');
  const searchParams = useSearchParams();
  
  // Refresh data when returning from Slack auth
  useEffect(() => {
    const justConnectedSlack = searchParams.get('slackConnected') === 'true';
    
    if (justConnectedSlack && status === 'authenticated') {
      // Refetch user data and force a hard reload
      const handleSlackConnection = async () => {
        try {
          toast.success("Slack account connected successfully!");
          
          // Update URL to remove the query parameter
          const url = new URL(window.location.href);
          url.searchParams.delete('slackConnected');
          
          // Force a complete page reload to get fresh session data
          window.location.href = url.toString();
        } catch (error) {
          console.error("Error refreshing user data:", error);
        }
      };
      
      handleSlackConnection();
    }
  }, [searchParams, status, router]);
  
  return <SettingsContent />;
}

// Main export that wraps the component with Suspense
export default function Settings() {
  return (
    <Suspense fallback={<Loading />}>
      <SettingsWithSearchParams />
    </Suspense>
  );
} 