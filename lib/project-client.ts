export interface ProgressMetrics {
  shippedHours: number;
  viralHours: number;
  otherHours: number;
  totalHours: number;
  totalPercentage: number;
  rawHours: number;
  currency: number;
}

// Helper to get project hours with our matching logic
export function getProjectHackatimeHours(project: any): number {
  // Safety check for null/undefined project
  if (!project) return 0;
  
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

// Helper to get ONLY approved hours (for clamshell calculation)
export function getProjectApprovedHours(project: any): number {
  // Safety check for null/undefined project
  if (!project) return 0;
  
  // If project has hackatimeLinks, calculate total from ONLY approved hours
  if (project.hackatimeLinks && project.hackatimeLinks.length > 0) {
    return project.hackatimeLinks.reduce((sum: number, link: any) => {
      // Only count hoursOverride as approved hours
      if (link.hoursOverride !== undefined && link.hoursOverride !== null) {
        return sum + link.hoursOverride;
      }
      // No hoursOverride means no approved hours for this link
      return sum;
    }, 0);
  }
  
  // Fallback for backward compatibility - use project-level hoursOverride
  return project?.hoursOverride || 0;
}

// Centralized function to calculate all progress metrics
export function calculateProgressMetrics(projects: any[]): ProgressMetrics {
  if (!projects || !Array.isArray(projects)) {
    return {
      shippedHours: 0,
      viralHours: 0,
      otherHours: 0,
      totalHours: 0,
      totalPercentage: 0,
      rawHours: 0,
      currency: 0
    };
  }

  let shippedHours = 0;
  let viralHours = 0;
  let otherHours = 0;
  let rawHours = 0;
  let currency = 0;

  // Get all projects sorted by hours for both calculations
  const allProjectsWithHours = projects
    .map(project => ({
      project,
      hours: getProjectHackatimeHours(project)
    }))
    .sort((a, b) => b.hours - a.hours);

  // Get top 4 projects for island percentage calculation
  const top4Projects = allProjectsWithHours.slice(0, 4);
  
  // Calculate island percentage from only top 4 projects
  top4Projects.forEach(({ project, hours }) => {
    // Cap hours per project at 15
    let cappedHours = Math.min(hours, 15);
    const approvedHours = getProjectApprovedHours(project);
    
    if (project?.viral === true && approvedHours > 0) {
      viralHours += cappedHours;
    } 
    // If it's shipped but not viral - only count if it has approved hours
    else if (project?.shipped === true && approvedHours > 0) {
      shippedHours += cappedHours;
    } 
    // Not shipped, not viral, or no approved hours
    else {
      // Cap non-shipped projects at 14.75 hours
      otherHours += Math.min(cappedHours, 14.75);
    }
  });

  // Calculate clamshells from all projects using ONLY approved hours
  const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio ≈ 1.618
  const top4ProjectIds = new Set(top4Projects.map(({ project }) => project.projectID));
  
  allProjectsWithHours.forEach(({ project, hours }) => {
    rawHours += hours;
    
    // Only generate clamshells for shipped projects using APPROVED hours only
    if (project?.shipped === true) {
      const approvedHours = getProjectApprovedHours(project);
      
      // Only generate clamshells if there are actually approved hours
      if (approvedHours > 0) {
        if (top4ProjectIds.has(project.projectID)) {
          // Top 4 projects: clamshells for approved hours beyond 15 (no cap)
          if (approvedHours > 15) {
            currency += (approvedHours - 15) * (phi * 10);
          }
        } else {
          // All other shipped projects: clamshells for ALL approved hours
          currency += approvedHours * (phi * 10);
        }
      }
    }
  });

  // Calculate total hours (capped at 60 for percentages)
  const totalHours = Math.min(shippedHours + viralHours + otherHours, 60);
  
  // Total progress percentage (capped at 100%)
  const totalPercentage = Math.min((totalHours / 60) * 100, 100);

  return {
    shippedHours,
    viralHours,
    otherHours,
    totalHours,
    totalPercentage,
    rawHours: Math.round(rawHours),
    currency: Math.floor(currency)
  };
} 