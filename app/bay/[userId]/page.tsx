"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { BayWithReviewMode } from '@/app/bay/page';
import type { ProjectType } from '@/app/api/projects/route';
import { ReviewModeProvider } from '@/app/contexts/ReviewModeContext';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

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
  );
}

function AccessDenied() {
  return (
    <div className="fixed inset-0 bg-[url(/bay.webp)] bg-cover bg-center">
      <div className="relative flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-5xl md:text-6xl font-serif mb-6 text-white font-bold">
            Access Denied
          </p>
          <p className="text-2xl md:text-3xl font-serif text-white">
            Admin access required
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminImpersonateBay() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is admin
  const isAdmin = session?.user?.role === 'Admin' || session?.user?.isAdmin === true;

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || !isAdmin) {
      return;
    }

    if (!userId) {
      toast.error('User ID is required');
      router.push('/admin/users');
      return;
    }

    fetchUserData();
  }, [session, status, userId, isAdmin, router]);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch user info and projects
      const [userResponse, projectsResponse] = await Promise.all([
        fetch(`/api/admin/users/${userId}`),
        fetch(`/api/admin/users/${userId}/projects`)
      ]);

      if (!userResponse.ok || !projectsResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await userResponse.json();
      const projectsData = await projectsResponse.json();

      setUser(userData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
      router.push('/admin/users');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return <Loading />;
  }

  if (!session || !isAdmin) {
    return <AccessDenied />;
  }

  if (!user) {
    return <Loading />;
  }

  // Prepare impersonation data for the bay component
  const impersonationData = {
    userId: userId,
    user: user,
    projects: projects
  };

  return (
    <ReviewModeProvider>
      <BayWithReviewMode 
        session={session} 
        status={status} 
        router={router}
        impersonationData={impersonationData}
      />
      <Toaster />
    </ReviewModeProvider>
  );
} 