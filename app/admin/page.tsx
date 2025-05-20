"use client"

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Stat card component for dashboard
function StatCard({ title, value, icon, linkTo, description = '' }: { title: string, value: number | string, icon: string, linkTo?: string, description?: string }) {
  const Card = (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
        </div>
        <div className="bg-blue-100 p-3 rounded-full">
          <span className="text-blue-800 text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  if (linkTo) {
    return <Link href={linkTo} className="block">{Card}</Link>;
  }
  return Card;
}

// Pie chart colors
const COLORS = ['#0088FE', '#FFBB28'];

// Pie chart component
function HackatimePieChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-4">Hackatime Installation</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} users`, 'Count']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    projectsInReview: 0,
    totalLogs: 0,
    hackatimeStats: {
      withHackatime: 0,
      withoutHackatime: 0,
      pieData: [] as { name: string; value: number }[]
    },
    hourStats: {
      totalRawHours: 0,
      totalEffectiveHours: 0,
      shippedHours: 0,
      reviewHours: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch dashboard stats
        const response = await fetch('/api/admin/dashboard');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status]);

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You need to be logged in to access the admin area.</p>
          <Link 
            href="/api/auth/signin"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Administrator Dashboard</h1>
        <p className="text-gray-600">Welcome to the Shipwrecked admin area. Manage users, projects, and reviews.</p>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">Overview Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Users" 
          value={stats.totalUsers} 
          icon="👤" 
          linkTo="/admin/users" 
        />
        <StatCard 
          title="Total Projects" 
          value={stats.totalProjects} 
          icon="🚢" 
          linkTo="/admin/projects" 
        />
        <StatCard 
          title="Projects In Review" 
          value={stats.projectsInReview} 
          icon="⏳" 
          linkTo="/admin/projects?filter=in_review" 
        />
        <StatCard 
          title="Logs" 
          value={stats.totalLogs} 
          icon="📋" 
          linkTo="/admin/audit-logs" 
        />
      </div>

      <h2 className="text-xl font-semibold mb-4">Project Hours</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard 
          title="Raw Hackatime Hours" 
          value={stats.hourStats.totalRawHours} 
          icon="⏱️" 
          description="Total hours logged in Hackatime before any overrides"
        />
        <StatCard 
          title="Effective Hours" 
          value={stats.hourStats.totalEffectiveHours} 
          icon="⚙️" 
          description="Total hours after applying manual overrides"
        />
        <StatCard 
          title="Shipped Hours" 
          value={stats.hourStats.shippedHours} 
          icon="🚀" 
          linkTo="/admin/projects?filter=shipped"
          description="Hours from projects marked as shipped"
        />
        <StatCard 
          title="Hours Under Review" 
          value={stats.hourStats.reviewHours} 
          icon="🔍" 
          linkTo="/admin/projects?filter=in_review"
          description="Hours from projects currently under review"
        />
      </div>

      <h2 className="text-xl font-semibold mb-4">Hackatime Installation</h2>
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
        <HackatimePieChart data={stats.hackatimeStats.pieData} />
      </div>
    </div>
  );
} 