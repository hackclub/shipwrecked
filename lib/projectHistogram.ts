import { prisma } from '@/lib/prisma';

interface ProjectHoursData {
  projectID: string;
  name: string;
  hours: number;
  viral: boolean;
  shipped: boolean;
}

interface HistogramBin {
  min: number;
  max: number;
  count: number;
  projects: string[]; // Project IDs in this bin
}

interface HistogramAnalysis {
  bins: HistogramBin[];
  mean: number;
  median: number;
  standardDeviation: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  outlierThresholds: {
    lower: number; // Q1 - 1.5 * IQR
    upper: number; // Q3 + 1.5 * IQR
  };
  classifications: {
    veryLow: number;    // < p25
    low: number;        // p25 - p50
    normal: number;     // p50 - p75
    high: number;       // p75 - p90
    veryHigh: number;   // > p90
  };
  lastUpdated: Date;
}

// Global variable to store the analysis
let cachedHistogramAnalysis: HistogramAnalysis | null = null;

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
 * Generate histogram bins using Freedman-Diaconis rule for optimal bin width
 */
function generateHistogramBins(hoursData: ProjectHoursData[]): HistogramBin[] {
  if (hoursData.length === 0) return [];
  
  const hours = hoursData.map(p => p.hours).sort((a, b) => a - b);
  const q1 = calculatePercentile(hours, 25);
  const q3 = calculatePercentile(hours, 75);
  const iqr = q3 - q1;
  
  // Freedman-Diaconis rule: bin width = 2 * IQR / n^(1/3)
  const binWidth = Math.max(1, (2 * iqr) / Math.pow(hours.length, 1/3));
  
  const minHours = Math.min(...hours);
  const maxHours = Math.max(...hours);
  const numBins = Math.max(5, Math.ceil((maxHours - minHours) / binWidth));
  
  const bins: HistogramBin[] = [];
  const actualBinWidth = (maxHours - minHours) / numBins;
  
  for (let i = 0; i < numBins; i++) {
    const binMin = minHours + (i * actualBinWidth);
    const binMax = i === numBins - 1 ? maxHours : minHours + ((i + 1) * actualBinWidth);
    
    const projectsInBin = hoursData.filter(p => 
      p.hours >= binMin && (i === numBins - 1 ? p.hours <= binMax : p.hours < binMax)
    );
    
    bins.push({
      min: binMin,
      max: binMax,
      count: projectsInBin.length,
      projects: projectsInBin.map(p => p.projectID)
    });
  }
  
  return bins;
}

/**
 * Analyze all projects and generate histogram data
 */
export async function generateProjectHistogramAnalysis(): Promise<HistogramAnalysis> {
  console.log('🔍 Starting project histogram analysis...');
  
  try {
    // Fetch all projects with their hackatime links
    const projects = await prisma.project.findMany({
      include: {
        hackatimeLinks: true
      }
    });
    
    console.log(`📊 Analyzing ${projects.length} projects...`);
    
    // Calculate hours for each project
    const projectHoursData: ProjectHoursData[] = projects.map(project => ({
      projectID: project.projectID,
      name: project.name,
      hours: calculateProjectHours(project),
      viral: project.viral,
      shipped: project.shipped
    })).filter(p => p.hours > 0); // Only include projects with hours > 0
    
    console.log(`📈 Found ${projectHoursData.length} projects with recorded hours`);
    
    if (projectHoursData.length === 0) {
      console.log('⚠️ No projects with hours found, returning empty analysis');
      return {
        bins: [],
        mean: 0,
        median: 0,
        standardDeviation: 0,
        percentiles: { p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 },
        outlierThresholds: { lower: 0, upper: 0 },
        classifications: { veryLow: 0, low: 0, normal: 0, high: 0, veryHigh: 0 },
        lastUpdated: new Date()
      };
    }
    
    // Sort hours for percentile calculations
    const sortedHours = projectHoursData.map(p => p.hours).sort((a, b) => a - b);
    
    // Calculate statistics
    const mean = sortedHours.reduce((sum, h) => sum + h, 0) / sortedHours.length;
    const median = calculatePercentile(sortedHours, 50);
    
    // Calculate standard deviation
    const variance = sortedHours.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / sortedHours.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate percentiles
    const percentiles = {
      p25: calculatePercentile(sortedHours, 25),
      p50: calculatePercentile(sortedHours, 50),
      p75: calculatePercentile(sortedHours, 75),
      p90: calculatePercentile(sortedHours, 90),
      p95: calculatePercentile(sortedHours, 95)
    };
    
    // Calculate outlier thresholds using IQR method
    const iqr = percentiles.p75 - percentiles.p25;
    const outlierThresholds = {
      lower: percentiles.p25 - (1.5 * iqr),
      upper: percentiles.p75 + (1.5 * iqr)
    };
    
    // Generate histogram bins
    const bins = generateHistogramBins(projectHoursData);
    
    // Calculate classification thresholds
    const classifications = {
      veryLow: percentiles.p25,
      low: percentiles.p50,
      normal: percentiles.p75,
      high: percentiles.p90,
      veryHigh: Infinity
    };
    
    const analysis: HistogramAnalysis = {
      bins,
      mean,
      median,
      standardDeviation,
      percentiles,
      outlierThresholds,
      classifications,
      lastUpdated: new Date()
    };
    
    console.log('📊 Histogram analysis complete:', {
      totalProjects: projectHoursData.length,
      mean: mean.toFixed(2),
      median: median.toFixed(2),
      standardDeviation: standardDeviation.toFixed(2),
      percentiles: {
        p25: percentiles.p25.toFixed(2),
        p50: percentiles.p50.toFixed(2),
        p75: percentiles.p75.toFixed(2),
        p90: percentiles.p90.toFixed(2),
        p95: percentiles.p95.toFixed(2)
      },
      numBins: bins.length
    });
    
    // Cache the result
    cachedHistogramAnalysis = analysis;
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Error generating project histogram analysis:', error);
    throw error;
  }
}

/**
 * Get the cached histogram analysis, or generate if not available
 */
export async function getProjectHistogramAnalysis(): Promise<HistogramAnalysis> {
  if (!cachedHistogramAnalysis) {
    console.log('📊 No cached analysis found, generating new one...');
    return await generateProjectHistogramAnalysis();
  }
  
  // Check if analysis is older than 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (cachedHistogramAnalysis.lastUpdated < oneHourAgo) {
    console.log('📊 Cached analysis is stale, regenerating...');
    return await generateProjectHistogramAnalysis();
  }
  
  return cachedHistogramAnalysis;
}

/**
 * Classify a project's hours as within or outside the norm
 */
export async function classifyProjectHours(projectHours: number): Promise<{
  classification: 'very-low' | 'low' | 'normal' | 'high' | 'very-high';
  percentile: number;
  isOutlier: boolean;
  description: string;
}> {
  const analysis = await getProjectHistogramAnalysis();
  
  let classification: 'very-low' | 'low' | 'normal' | 'high' | 'very-high';
  let description: string;
  
  if (projectHours < analysis.classifications.veryLow) {
    classification = 'very-low';
    description = 'Well below average';
  } else if (projectHours < analysis.classifications.low) {
    classification = 'low';
    description = 'Below average';
  } else if (projectHours < analysis.classifications.normal) {
    classification = 'normal';
    description = 'Average';
  } else if (projectHours < analysis.classifications.high) {
    classification = 'high';
    description = 'Above average';
  } else {
    classification = 'very-high';
    description = 'Well above average';
  }
  
  // Calculate percentile
  const sortedHours = analysis.bins.flatMap(bin => 
    Array(bin.count).fill((bin.min + bin.max) / 2)
  ).sort((a, b) => a - b);
  
  const percentile = (sortedHours.filter(h => h <= projectHours).length / sortedHours.length) * 100;
  
  // Check if it's an outlier
  const isOutlier = projectHours < analysis.outlierThresholds.lower || 
                   projectHours > analysis.outlierThresholds.upper;
  
  return {
    classification,
    percentile: Math.round(percentile),
    isOutlier,
    description
  };
}

/**
 * Initialize histogram analysis on startup
 */
export async function initializeProjectHistogramAnalysis(): Promise<void> {
  console.log('🚀 Initializing project histogram analysis on startup...');
  
  try {
    await generateProjectHistogramAnalysis();
    console.log('✅ Project histogram analysis initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize project histogram analysis:', error);
    // Don't throw - let the app start even if histogram analysis fails
  }
}
