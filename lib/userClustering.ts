import { prisma } from '@/lib/prisma';

interface UserMetrics {
  userId: string;
  totalHours: number;
  projectCount: number;
  shippedProjectCount: number;
  isWhale?: boolean;
  isNewbie?: boolean;
  isShipper?: boolean;
}

interface UserClusterAnalysis {
  totalUsers: number;
  clusters: {
    whales: {
      count: number;
      percentage: number;
      users: string[]; // User IDs
      thresholds: {
        minHours: number;
        minProjects: number;
        minShipped: number;
      };
    };
    shippers: {
      count: number;
      percentage: number;
      users: string[];
      thresholds: {
        hourRange: [number, number];
        projectRange: [number, number];
        shippedRange: [number, number];
      };
    };
    newbies: {
      count: number;
      percentage: number;
      users: string[];
      thresholds: {
        maxHours: number;
        maxProjects: number;
        maxShipped: number;
      };
    };
  };
  statistics: {
    hours: {
      mean: number;
      median: number;
      p75: number;
      p90: number;
    };
    projects: {
      mean: number;
      median: number;
      p75: number;
      p90: number;
    };
    shipped: {
      mean: number;
      median: number;
      p75: number;
      p90: number;
    };
  };
  lastUpdated: Date;
}

// Global variable to store the analysis
let cachedUserClusterAnalysis: UserClusterAnalysis | null = null;

/**
 * Calculate effective hours for a project using the same logic as the UI
 */
function calculateProjectHours(project: any): number {
  // If project has hackatimeLinks, calculate total from all links
  if (project.hackatimeLinks && project.hackatimeLinks.length > 0) {
    return project.hackatimeLinks.reduce((sum: number, link: any) => {
      // Use the link's hoursOverride if it exists, otherwise use rawHours
      const effectiveHours = (link.hoursOverride !== undefined && link.hoursOverride !== null)
        ? link.hoursOverride
        : (typeof link.rawHours === 'number' ? link.rawHours : 0);
      
      return sum + effectiveHours;
    }, 0);
  }
  
  // Fallback for backward compatibility - use project-level rawHours
  return project?.rawHours || 0;
}

/**
 * Calculate percentiles from a sorted array
 */
function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  
  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) {
    return sortedArray[lower];
  }
  
  const weight = index - lower;
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Categorize users based on their metrics
 */
function categorizeUsers(userMetrics: UserMetrics[]): {
  whales: UserMetrics[];
  shippers: UserMetrics[];
  newbies: UserMetrics[];
  thresholds: any;
} {
  if (userMetrics.length === 0) {
    return { 
      whales: [], 
      shippers: [], 
      newbies: [], 
      thresholds: { whale: {}, shipper: {}, newbie: {} }
    };
  }

  // Calculate percentiles for each dimension
  const sortedHours = userMetrics.map(u => u.totalHours).sort((a, b) => a - b);
  const sortedProjects = userMetrics.map(u => u.projectCount).sort((a, b) => a - b);
  const sortedShipped = userMetrics.map(u => u.shippedProjectCount).sort((a, b) => a - b);

  // Define thresholds
  const hoursP75 = calculatePercentile(sortedHours, 75);
  const hoursP50 = calculatePercentile(sortedHours, 50);
  const hoursP25 = calculatePercentile(sortedHours, 25);
  
  const projectsP75 = calculatePercentile(sortedProjects, 75);
  const projectsP50 = calculatePercentile(sortedProjects, 50);
  const projectsP25 = calculatePercentile(sortedProjects, 25);
  
  const shippedP75 = calculatePercentile(sortedShipped, 75);
  const shippedP50 = calculatePercentile(sortedShipped, 50);

  // Whale criteria: Top 25% in at least 2 dimensions, and above median in all
  const whaleThresholds = {
    minHours: hoursP50,
    minProjects: projectsP50,
    minShipped: Math.max(1, shippedP50) // At least 1 shipped project
  };

  // Newbie criteria: Bottom 25% in hours AND projects, and 0 shipped
  const newbieThresholds = {
    maxHours: hoursP25,
    maxProjects: Math.max(1, projectsP25), // 0-1 projects
    maxShipped: 0 // No shipped projects
  };

  // Shipper criteria: Everything in between
  const shipperThresholds = {
    hourRange: [hoursP25, hoursP75] as [number, number],
    projectRange: [projectsP25, projectsP75] as [number, number],
    shippedRange: [0, shippedP75] as [number, number]
  };

  const whales: UserMetrics[] = [];
  const newbies: UserMetrics[] = [];
  const shippers: UserMetrics[] = [];

  userMetrics.forEach(user => {
    // Check for Whale: High performance in at least 2/3 dimensions
    const isHighHours = user.totalHours >= hoursP75;
    const isHighProjects = user.projectCount >= projectsP75;
    const isHighShipped = user.shippedProjectCount >= shippedP75;
    const highDimensionCount = [isHighHours, isHighProjects, isHighShipped].filter(Boolean).length;
    
    const meetsWhaleMinimums = user.totalHours >= whaleThresholds.minHours && 
                              user.projectCount >= whaleThresholds.minProjects && 
                              user.shippedProjectCount >= whaleThresholds.minShipped;

    // Check for Newbie: Low engagement across all dimensions
    const isNewbie = user.totalHours <= newbieThresholds.maxHours &&
                     user.projectCount <= newbieThresholds.maxProjects &&
                     user.shippedProjectCount <= newbieThresholds.maxShipped;

    if (highDimensionCount >= 2 && meetsWhaleMinimums) {
      user.isWhale = true;
      whales.push(user);
    } else if (isNewbie) {
      user.isNewbie = true;
      newbies.push(user);
    } else {
      user.isShipper = true;
      shippers.push(user);
    }
  });

  return {
    whales,
    shippers,
    newbies,
    thresholds: {
      whale: whaleThresholds,
      shipper: shipperThresholds,
      newbie: newbieThresholds
    }
  };
}

/**
 * Analyze all users and generate clustering data
 */
export async function generateUserClusterAnalysis(): Promise<UserClusterAnalysis> {
  console.log('🔍 Starting user cluster analysis...');
  
  try {
    // Fetch all users with their projects
    const users = await prisma.user.findMany({
      include: {
        projects: {
          include: {
            hackatimeLinks: true
          }
        }
      }
    });
    
    console.log(`👥 Analyzing ${users.length} users...`);
    
    // Calculate metrics for each user
    const userMetrics: UserMetrics[] = users.map(user => {
      const totalHours = user.projects.reduce((sum, project) => {
        return sum + calculateProjectHours(project);
      }, 0);
      
      const projectCount = user.projects.length;
      const shippedProjectCount = user.projects.filter(p => p.shipped).length;
      
      return {
        userId: user.id,
        totalHours,
        projectCount,
        shippedProjectCount
      };
    }); // Include all users, even those with zero activity (they'll be categorized as newbies)
    
    console.log(`📊 Analyzing ${userMetrics.length} total users (including inactive users)`);
    
    if (userMetrics.length === 0) {
      console.log('⚠️ No active users found, returning empty analysis');
      return {
        totalUsers: 0,
        clusters: {
          whales: { count: 0, percentage: 0, users: [], thresholds: { minHours: 0, minProjects: 0, minShipped: 0 } },
          shippers: { count: 0, percentage: 0, users: [], thresholds: { hourRange: [0, 0], projectRange: [0, 0], shippedRange: [0, 0] } },
          newbies: { count: 0, percentage: 0, users: [], thresholds: { maxHours: 0, maxProjects: 0, maxShipped: 0 } }
        },
        statistics: {
          hours: { mean: 0, median: 0, p75: 0, p90: 0 },
          projects: { mean: 0, median: 0, p75: 0, p90: 0 },
          shipped: { mean: 0, median: 0, p75: 0, p90: 0 }
        },
        lastUpdated: new Date()
      };
    }
    
    // Categorize users
    const { whales, shippers, newbies, thresholds } = categorizeUsers(userMetrics);
    
    // Calculate statistics
    const sortedHours = userMetrics.map(u => u.totalHours).sort((a, b) => a - b);
    const sortedProjects = userMetrics.map(u => u.projectCount).sort((a, b) => a - b);
    const sortedShipped = userMetrics.map(u => u.shippedProjectCount).sort((a, b) => a - b);
    
    const statistics = {
      hours: {
        mean: sortedHours.reduce((sum, h) => sum + h, 0) / sortedHours.length,
        median: calculatePercentile(sortedHours, 50),
        p75: calculatePercentile(sortedHours, 75),
        p90: calculatePercentile(sortedHours, 90)
      },
      projects: {
        mean: sortedProjects.reduce((sum, p) => sum + p, 0) / sortedProjects.length,
        median: calculatePercentile(sortedProjects, 50),
        p75: calculatePercentile(sortedProjects, 75),
        p90: calculatePercentile(sortedProjects, 90)
      },
      shipped: {
        mean: sortedShipped.reduce((sum, s) => sum + s, 0) / sortedShipped.length,
        median: calculatePercentile(sortedShipped, 50),
        p75: calculatePercentile(sortedShipped, 75),
        p90: calculatePercentile(sortedShipped, 90)
      }
    };
    
    const totalActiveUsers = userMetrics.length;
    
    const analysis: UserClusterAnalysis = {
      totalUsers: totalActiveUsers,
      clusters: {
        whales: {
          count: whales.length,
          percentage: (whales.length / totalActiveUsers) * 100,
          users: whales.map(u => u.userId),
          thresholds: thresholds.whale
        },
        shippers: {
          count: shippers.length,
          percentage: (shippers.length / totalActiveUsers) * 100,
          users: shippers.map(u => u.userId),
          thresholds: thresholds.shipper
        },
        newbies: {
          count: newbies.length,
          percentage: (newbies.length / totalActiveUsers) * 100,
          users: newbies.map(u => u.userId),
          thresholds: thresholds.newbie
        }
      },
      statistics,
      lastUpdated: new Date()
    };
    
    console.log('👥 User cluster analysis complete:', {
      totalUsers: totalActiveUsers,
      whales: whales.length,
      shippers: shippers.length,
      newbies: newbies.length,
      statistics: {
        avgHours: statistics.hours.mean.toFixed(2),
        avgProjects: statistics.projects.mean.toFixed(2),
        avgShipped: statistics.shipped.mean.toFixed(2)
      }
    });
    
    // Cache the result
    cachedUserClusterAnalysis = analysis;
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Error generating user cluster analysis:', error);
    throw error;
  }
}

/**
 * Get the cached user cluster analysis, or generate if not available
 */
export async function getUserClusterAnalysis(): Promise<UserClusterAnalysis> {
  if (!cachedUserClusterAnalysis) {
    console.log('👥 No cached user analysis found, generating new one...');
    return await generateUserClusterAnalysis();
  }
  
  // Check if analysis is older than 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (cachedUserClusterAnalysis.lastUpdated < oneHourAgo) {
    console.log('👥 Cached user analysis is stale, regenerating...');
    return await generateUserClusterAnalysis();
  }
  
  return cachedUserClusterAnalysis;
}

/**
 * Classify a user based on their metrics
 */
export async function classifyUser(userId: string): Promise<{
  category: 'whale' | 'shipper' | 'newbie';
  metrics: {
    totalHours: number;
    projectCount: number;
    shippedProjectCount: number;
  };
  percentiles: {
    hours: number;
    projects: number;
    shipped: number;
  };
  description: string;
}> {
  const analysis = await getUserClusterAnalysis();
  
  // Find user in clusters
  let category: 'whale' | 'shipper' | 'newbie' = 'newbie';
  if (analysis.clusters.whales.users.includes(userId)) {
    category = 'whale';
  } else if (analysis.clusters.shippers.users.includes(userId)) {
    category = 'shipper';
  }
  
  // Fetch user's actual metrics
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      projects: {
        include: {
          hackatimeLinks: true
        }
      }
    }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const totalHours = user.projects.reduce((sum, project) => {
    return sum + calculateProjectHours(project);
  }, 0);
  
  const projectCount = user.projects.length;
  const shippedProjectCount = user.projects.filter(p => p.shipped).length;
  
  // Calculate percentiles (simplified)
  const hoursPercentile = totalHours > analysis.statistics.hours.median ? 75 : 25;
  const projectsPercentile = projectCount > analysis.statistics.projects.median ? 75 : 25;
  const shippedPercentile = shippedProjectCount > analysis.statistics.shipped.median ? 75 : 25;
  
  const descriptions = {
    whale: 'High-impact creator with significant hours, multiple projects, and regular shipping',
    shipper: 'Active contributor with balanced engagement and shipping activity',
    newbie: 'New or low-activity user with minimal projects and shipping'
  };
  
  return {
    category,
    metrics: {
      totalHours,
      projectCount,
      shippedProjectCount
    },
    percentiles: {
      hours: hoursPercentile,
      projects: projectsPercentile,
      shipped: shippedPercentile
    },
    description: descriptions[category]
  };
}

/**
 * Initialize user cluster analysis on startup
 */
export async function initializeUserClusterAnalysis(): Promise<void> {
  console.log('🚀 Initializing user cluster analysis on startup...');
  
  try {
    await generateUserClusterAnalysis();
    console.log('✅ User cluster analysis initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize user cluster analysis:', error);
    // Don't throw - let the app start even if user analysis fails
  }
} 