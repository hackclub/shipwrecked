'use client';
import styles from './page.module.css';
import Modal from '@/components/common/Modal';
import Toast from '@/components/common/Toast';
import { useState, useEffect, useActionState, useContext, useMemo, ReactElement, useCallback } from 'react';
import type { FormSave } from '@/components/form/FormInput';
import { Project } from '@/components/common/Project';
import FormSelect from '@/components/form/FormSelect';
import FormInput from '@/components/form/FormInput';
import { useSession } from 'next-auth/react';
import { Toaster, toast } from "sonner";
import ProgressBar from '@/components/common/ProgressBar';
import MultiPartProgressBar, { ProgressSegment } from '@/components/common/MultiPartProgressBar';
import type { ProjectType } from '../api/projects/route';
import { useRouter } from 'next/navigation';
import type { HackatimeProject } from "@/types/hackatime";
import Icon from "@hackclub/icons";
import Tooltip from '../components/common/Tooltip';
import Link from 'next/link';
import Header from '@/components/common/Header';
import ProjectStatus from '../components/common/ProjectStatus';
import { useIsMobile } from '@/lib/hooks';
import ReviewSection from '@/components/common/ReviewSection';
import { ReviewModeProvider, useReviewMode } from '@/app/contexts/ReviewModeContext';
import ProjectFlagsEditor, { ProjectFlags } from '@/components/common/ProjectFlagsEditor';
import ProjectReviewRequest from '@/components/common/ProjectReviewRequest';
import ImageWithFallback from '@/components/common/ImageWithFallback';

// Force dynamic rendering to prevent prerendering errors during build
export const dynamic = 'force-dynamic';

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

// Add these action functions before the Bay component
async function createProjectAction(state: FormSave, formData: FormData): Promise<FormSave> {
  // Convert FormData to a normal object for better debugging
  const formDataObj: Record<string, any> = {};
  
  // Extract multiple hackatimeProjects entries correctly
  const hackatimeProjects: string[] = [];
  
  // Process all form fields
  for (const [key, value] of formData.entries()) {
    if (key === 'hackatimeProjects') {
      // Collect all hackatimeProjects values into an array
      if (typeof value === 'string') {
        hackatimeProjects.push(value);
      }
    } else {
      // For other fields, just store the last value
      formDataObj[key] = value;
    }
  }
  
  // Add the collected hackatimeProjects array to the form data object
  formDataObj.hackatimeProjects = hackatimeProjects;
  
  // Make the API call
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formDataObj)
  });

  if (!response.ok) {
    throw new Error('Failed to create project');
  }

  return await response.json();
}

async function editProjectAction(state: FormSave, formData: FormData): Promise<FormSave> {
  const response = await fetch('/api/projects', {
    method: 'PUT',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to edit project');
  }

  return await response.json();
}

// Move getHackatimeProjects outside of Bay component
async function getHackatimeProjects() {
  try {
    const response = await fetch('/api/hackatime/projects');
    
    if (!response.ok) {
      console.error('Hackatime API returned error:', response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    
    // Ensure we have an array
    if (!Array.isArray(data)) {
      console.error('Hackatime API returned non-array data:', data);
      return [];
    }
    
    return data as HackatimeProject[];
  } catch (error) {
    console.error('Failed to fetch Hackatime projects:', error);
    return [];
  }
}

// Project Detail Component
function ProjectDetail({ 
  project, 
  onEdit,
  setProjects
}: { 
  project: ProjectType, 
  onEdit: (project?: any) => void,
  setProjects: React.Dispatch<React.SetStateAction<ProjectType[]>>
}): ReactElement {
  console.log(`[DEBUG] ProjectDetail render for ${project.name} - projectID: ${project.projectID}`);
  
  const { isReviewMode } = useReviewMode();
  const [projectFlags, setProjectFlags] = useState<ProjectFlags>({
    shipped: !!project.shipped,
    viral: !!project.viral,
    in_review: !!project.in_review
  });
  
  // Determine if editing is allowed based on review mode and project status
  const isEditingAllowed = isReviewMode || !projectFlags.in_review;
  
  // Update projectFlags when project prop changes
  // This was part of the problem - it was causing re-renders when project changed
  // which then caused another state update in a loop
  useEffect(() => {
    console.log(`[DEBUG] ProjectDetail useEffect for project changes - ${project.name}`);
    
    // Only update if the flags have actually changed to prevent infinite loops
    const shouldUpdate = 
      projectFlags.shipped !== !!project.shipped ||
      projectFlags.viral !== !!project.viral ||
      projectFlags.in_review !== !!project.in_review;
      
    if (shouldUpdate) {
      console.log('[DEBUG] Updating project flags due to changes');
      setProjectFlags({
        shipped: !!project.shipped,
        viral: !!project.viral,
        in_review: !!project.in_review
      });
    } else {
      console.log('[DEBUG] Skipping redundant project flags update');
    }
  }, [project.shipped, project.viral, project.in_review]);

  // Calculate project's contribution percentage - memoize to avoid recalculations
  const projectHours = useMemo(() => {
    console.log(`[DEBUG] ProjectDetail calculating hours for ${project.name}`);
    
    // If viral, it's 15 hours (25% toward the 60-hour goal)
    if (projectFlags.viral) {
      return 15;
    }
    
    // Use hoursOverride if present, otherwise use rawHours
    const rawHours = typeof project.hoursOverride === 'number' && project.hoursOverride !== null 
      ? project.hoursOverride 
      : (project.rawHours || 0);
    
    // Cap hours per project at 15
    let cappedHours = Math.min(rawHours, 15);
    
    // If the project is not shipped, cap it at 14.75 hours
    if (!projectFlags.shipped && cappedHours > 14.75) {
      cappedHours = 14.75;
    }
    
    return cappedHours;
  }, [project.hoursOverride, project.rawHours, projectFlags.viral, projectFlags.shipped]);
  
  const contributionPercentage = Math.round((projectHours / 60) * 100);
  
  const handleEdit = () => {
    // Explicitly call onEdit with the full project data to ensure proper form initialization
    // Add isEditing flag to indicate this is an explicit edit button click
    onEdit({
      ...project,
      isEditing: true
    });
  };

  const handleFlagsUpdated = (updatedProject: any) => {
    console.log('[DEBUG] handleFlagsUpdated called with:', updatedProject);
    console.log('[DEBUG] Full updated project data:', JSON.stringify(updatedProject));
    
    // Make a copy of the incoming project data to avoid mutation
    const incomingData = {
      shipped: !!updatedProject.shipped,
      viral: !!updatedProject.viral, 
      in_review: !!updatedProject.in_review,
      hackatimeLinkOverrides: updatedProject.hackatimeLinkOverrides 
        ? {...updatedProject.hackatimeLinkOverrides}
        : undefined
    };
    
    console.log('[DEBUG] Incoming data normalized:', JSON.stringify(incomingData));
    
    // Deep comparison for hackatimeLinkOverrides to detect actual changes
    const hasOverrideChanges = (): boolean => {
      // If neither has overrides, no changes
      if (!incomingData.hackatimeLinkOverrides && !projectFlags.hackatimeLinkOverrides) {
        return false;
      }
      
      // If one has overrides but the other doesn't, there are changes
      if (!incomingData.hackatimeLinkOverrides || !projectFlags.hackatimeLinkOverrides) {
        return true;
      }
      
      const keys1 = Object.keys(incomingData.hackatimeLinkOverrides);
      const keys2 = Object.keys(projectFlags.hackatimeLinkOverrides || {});
      
      // Different number of keys means changes
      if (keys1.length !== keys2.length) {
        return true;
      }
      
      // Check each key for changes
      for (const key of keys1) {
        const val1 = incomingData.hackatimeLinkOverrides[key];
        const val2 = projectFlags.hackatimeLinkOverrides?.[key];
        
        // Handle undefined/null equality correctly
        if ((val1 === null || val1 === undefined) && (val2 === null || val2 === undefined)) {
          continue;
        }
        
        // If values are different, there are changes
        if (val1 !== val2) {
          return true;
        }
      }
      
      // No changes detected
      return false;
    };
    
    // Detect what specific changes occurred
    const hasViralChanged = incomingData.viral !== projectFlags.viral;
    const hasShippedChanged = incomingData.shipped !== projectFlags.shipped;
    const hasInReviewChanged = incomingData.in_review !== projectFlags.in_review;
    const hasHourChanges = hasOverrideChanges();
    
    // Check if there's any actual change to avoid unnecessary updates
    const hasChanges = hasViralChanged || hasShippedChanged || hasInReviewChanged || hasHourChanges;
    
    console.log('[DEBUG] Change detection results:', {
      shipped: hasShippedChanged,
      viral: hasViralChanged,
      inReview: hasInReviewChanged,
      hours: hasHourChanges,
      anyChange: hasChanges
    });
    
    if (!hasChanges) {
      console.log('[DEBUG] No flag changes, skipping updates');
      return;
    }
    
    // First, update the local flag state to track what's changed
    const newProjectFlags: ProjectFlags = {
      ...projectFlags,
      shipped: incomingData.shipped,
      viral: incomingData.viral,
      in_review: incomingData.in_review,
    };
    
    // Preserve hour overrides regardless of viral status
    if (incomingData.hackatimeLinkOverrides) {
      newProjectFlags.hackatimeLinkOverrides = Object.fromEntries(
        Object.entries(incomingData.hackatimeLinkOverrides).map(([key, value]) => 
          [key, value === null ? undefined : (value as number | undefined)]
        )
      ) as Record<string, number | undefined>;
    } else if (projectFlags.hackatimeLinkOverrides) {
      // If no new overrides but we had some before, preserve them
      newProjectFlags.hackatimeLinkOverrides = {...projectFlags.hackatimeLinkOverrides};
    }
    
    // IMPORTANT: Process the hackatimeLinkOverrides if present
    let hackatimeLinks = [...(project.hackatimeLinks || [])];
    
    // Only update link overrides if we explicitly received changes to them
    if (incomingData.hackatimeLinkOverrides) {
      console.log('[DEBUG] Processing hackatimeLinkOverrides:', incomingData.hackatimeLinkOverrides);
      
      // Track whether any links were actually changed
      let linksChanged = false;
      
      // Update each link's hoursOverride based on the overrides object
      hackatimeLinks = hackatimeLinks.map(link => {
        // Only update links that were explicitly included in the overrides
        if (link.id in incomingData.hackatimeLinkOverrides) {
          const override = incomingData.hackatimeLinkOverrides[link.id];
          
          // Normalize the existing value for comparison
          const currentOverride = link.hoursOverride === null ? undefined : link.hoursOverride;
          
          // Skip if they're equivalent
          if (override === currentOverride) {
            return link;
          }
          
          console.log(`[DEBUG] Updating link ${link.id} (${link.hackatimeName}) override: ${link.hoursOverride} → ${override}`);
          linksChanged = true;
          
          return {
            ...link,
            // Override can be number or undefined, but not null, so convert null to undefined
            hoursOverride: override === null ? undefined : (typeof override === 'number' ? override : undefined)
          };
        }
        
        // For links not explicitly mentioned, keep their current value
        return link;
      });
      
      console.log('[DEBUG] Updated hackatimeLinks:', JSON.stringify(hackatimeLinks));
    }
    
    // Update local state first
    setProjectFlags(newProjectFlags);
    
    // Calculate new total hoursOverride if needed
    // NOTE: Even for viral projects, we track the hour overrides separately
    // so that if viral status is later removed, the hour overrides are still there
    let hoursOverride: number | undefined = undefined;
    
    // Only recalculate hoursOverride if we have links with overrides
    if (hackatimeLinks && hackatimeLinks.length > 0) {
      // Check if at least one link has an override
      const hasAnyOverride = hackatimeLinks.some(link => 
        link.hoursOverride !== undefined && link.hoursOverride !== null
      );
      
      if (hasAnyOverride) {
        // Sum up all hours, using overrides where available
        const totalOverrideHours = hackatimeLinks.reduce((sum, link) => {
          // Handle both null and undefined properly for hoursOverride
          const hours = (link.hoursOverride === null || link.hoursOverride === undefined) ? 
            link.rawHours : 
            link.hoursOverride;
          
          return sum + (typeof hours === 'number' ? hours : 0);
        }, 0);
        
        console.log(`[DEBUG] Calculated new total hoursOverride: ${totalOverrideHours}`);
        hoursOverride = totalOverrideHours;
      }
    }
    
    console.log(`[DEBUG] Final hoursOverride value: ${hoursOverride}`);
    
    // Create a new object with the updated flags and links
    const updatedProjectData = {
      ...project,
      shipped: incomingData.shipped,
      viral: incomingData.viral,
      in_review: incomingData.in_review,
      hackatimeLinks,
      // Make sure hoursOverride is the correct type (number or undefined, not null)
      hoursOverride: hoursOverride
    };
    
    console.log('[DEBUG] Updating project in projects array:', JSON.stringify(updatedProjectData));
    
    // Update the projects array with the new data - do it synchronously
    setProjects(prevProjects => {
      console.log('[DEBUG] In setProjects callback, prevProjects.length:', prevProjects.length);
      return prevProjects.map(p => 
        p.projectID === project.projectID ? updatedProjectData as ProjectType : p
      );
    });
  };
  
  // Track the current flag changes from the editor
  const [currentEditorFlags, setCurrentEditorFlags] = useState<ProjectFlags>(projectFlags);
  
  // Handle changes from the flag editor
  const handleFlagEditorChange = (flags: ProjectFlags) => {
    console.log('[DEBUG] ProjectDetail handleFlagEditorChange:', JSON.stringify(flags));
    
    // Update our local state to track what's in the editor
    setCurrentEditorFlags(flags);
    
    // Forward changes to the handler immediately without setTimeout
    handleFlagsUpdated({
      ...project,
      shipped: flags.shipped,
      viral: flags.viral,
      in_review: flags.in_review,
      hackatimeLinkOverrides: flags.hackatimeLinkOverrides ? 
        // Ensure correct types when passing override values
        Object.fromEntries(
          Object.entries(flags.hackatimeLinkOverrides).map(([key, value]) => 
            [key, value === null ? undefined : (value as number | undefined)]
          )
        ) as Record<string, number | undefined> : {}
    });
  };
  
  // console.log(`ProjectDetail rendering: ${project.name}, hours=${projectHours}, viral=${project.viral}, shipped=${project.shipped}`);
  
  return (
    <div className={`${styles.editForm}`}>
      <div className="flex justify-between items-center mb-5 border-b pb-3 sticky top-0 bg-white z-10">
        <h2 className="text-2xl font-bold">{project.name}</h2>
        {isEditingAllowed ? (
          <button
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            onClick={handleEdit}
            aria-label="Edit project"
          >
            <span>Edit</span>
          </button>
        ) : (
          <span className="text-sm text-gray-500 italic">
            Cannot edit while in review
          </span>
        )}
      </div>
      
      <div className="space-y-5 pb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
          <p className="text-base text-gray-900">{project.description || "No description provided."}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-center text-sm">
            <p>This project contributes <strong>{projectHours}</strong> hour{projectHours !== 1 && 's'} (<strong>{contributionPercentage}%</strong>) toward your island journey</p>
            <ProjectStatus 
              viral={projectFlags.viral} 
              shipped={projectFlags.shipped} 
              in_review={projectFlags.in_review}
            />
          </div>
        </div>
        
        {/* Project Hours Details Section */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Total Hours</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">Raw Hours</span>
              <p className="text-lg font-semibold mt-1">
                {(() => {
                  // Calculate the sum of raw hours from all hackatimeLinks
                  const totalRawHours = (project.hackatimeLinks || []).reduce(
                    (sum, link: {id: string; hackatimeName: string; rawHours: number; hoursOverride?: number | null}) => 
                      sum + (typeof link.rawHours === 'number' ? link.rawHours : 0),
                    0
                  );
                  return `${totalRawHours.toFixed(1)}h`;
                })()}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Approved</span>
              <p className="text-lg font-semibold mt-1">
                {(() => {
                  // Calculate if any links have overrides
                  const hasAnyOverride = (project.hackatimeLinks || []).some(link => 
                    link.hoursOverride !== undefined && link.hoursOverride !== null
                  );
                  
                  if (hasAnyOverride) {
                    // Sum up all hours, using overrides where available
                    const totalOverrideHours = (project.hackatimeLinks || []).reduce((sum, link) => {
                      // Use override if available, otherwise use raw hours
                      const hours = (link.hoursOverride === null || link.hoursOverride === undefined) ? 
                        link.rawHours : 
                        link.hoursOverride;
                      
                      return sum + (typeof hours === 'number' ? hours : 0);
                    }, 0);
                    
                    return `${totalOverrideHours.toFixed(1)}h`;
                  }
                  
                  return '—';
                })()}
              </p>
            </div>
          </div>
          
          {/* Project Flag Editor - Only shown in review mode */}
          {isReviewMode && (
            <div className="mt-4">
              <ProjectFlagsEditor
                projectID={project.projectID}
                initialShipped={projectFlags.shipped}
                initialViral={projectFlags.viral}
                initialInReview={projectFlags.in_review}
                hackatimeLinks={project.hackatimeLinks}
                onChange={handleFlagEditorChange}
              />
              <div className="mt-2 text-xs text-gray-500">
                <p>These changes will be applied when you submit a review.</p>
              </div>
            </div>
          )}
          
          {/* Hackatime Links Section */}
          {project.hackatimeLinks && project.hackatimeLinks.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Hackatime Project Links</h4>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                      <th className="px-1 sm:px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Raw</th>
                      <th className="px-1 sm:px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Approved</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {project.hackatimeLinks.map((link) => (
                      <tr key={link.id}>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 break-words">{link.hackatimeName}</td>
                        <td className="px-1 sm:px-3 py-2 text-xs sm:text-sm text-gray-500 text-center">
                          {typeof link.rawHours === 'number' ? `${link.rawHours}h` : '—'}
                        </td>
                        <td className="px-1 sm:px-3 py-2 text-xs sm:text-sm text-center text-blue-600">
                          {link.hoursOverride !== undefined && link.hoursOverride !== null 
                            ? `${link.hoursOverride}h` 
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Project Review Request - only visible when NOT in review mode and not already in review */}
        <ProjectReviewRequest
          projectID={project.projectID}
          isInReview={projectFlags.in_review}
          isShipped={projectFlags.shipped}
          isViral={projectFlags.viral}
          onRequestSubmitted={(updatedProject, review) => {
            // Update projectFlags with the updated data
            setProjectFlags(prev => ({
              ...prev,
              in_review: true
            }));
            
            // Update projects array
            setProjects(prevProjects => 
              prevProjects.map(p => 
                p.projectID === project.projectID ? {...p, in_review: true} as ProjectType : p
              )
            );
            
            // Force a refresh of reviews
            // This would normally be handled by the ReviewSection component itself
            // but we can notify it explicitly if needed
          }}
        />
        
        {project.hackatime && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Hackatime Project</h3>
            <p className="text-base text-gray-900">{project.hackatime}</p>
          </div>
        )}
        
        {/* Project Status section - only visible when NOT in review mode */}
        {!isReviewMode && (
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3 col-span-2">Project Status</h3>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${projectFlags.viral ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm text-gray-700">Viral</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${projectFlags.shipped ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm text-gray-700">Shipped</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${projectFlags.in_review ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm text-gray-700">In Review</span>
            </div>
          </div>
        )}
        
        {(project.codeUrl || project.playableUrl) && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Links</h3>
            <div className="flex flex-col gap-2">
              {project.codeUrl && (
                <a 
                  href={project.codeUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Icon glyph="github" size={16} />
                  View Code Repository
                </a>
              )}
              {project.playableUrl && (
                <a 
                  href={project.playableUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Icon glyph="link" size={16} />
                  Try It Out
                </a>
              )}
            </div>
          </div>
        )}
        
        {project.screenshot && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Screenshot</h3>
            <div className="relative mt-2 w-full h-64 rounded-lg border border-gray-200 overflow-hidden">
              <ImageWithFallback
                src={project.screenshot}
                alt={`Screenshot of ${project.name}`}
                fill
                className="object-contain"
              />
            </div>
          </div>
        )}
        
        {/* Project Reviews Section */}
        <ReviewSection 
          projectID={project.projectID} 
          initialFlags={projectFlags}
          onFlagsUpdated={handleFlagsUpdated}
          rawHours={project.rawHours}
          hackatimeLinks={project.hackatimeLinks}
        />
      </div>
    </div>
  );
}

// Create a custom hook for project hours calculation to avoid conditional hook calls
function useProjectHours(projectId: string | null, projects: ProjectType[]): number {
  // This hook will be called consistently on every render
  return useMemo(() => {
    if (!projectId) return 0;
    
    const project = projects.find(p => p.projectID === projectId);
    if (!project) return 0;
    
    // If viral, it's 15 hours
    if (project.viral) return 15;
    
    // Use hoursOverride if present, otherwise use rawHours
    const hoursOverride = project.hoursOverride;
    const rawHours = (typeof hoursOverride === 'number' && hoursOverride !== null) 
      ? hoursOverride 
      : (project.rawHours || 0);
    
    // Cap hours per project at 15
    let cappedHours = Math.min(rawHours, 15);
    
    // If the project is not shipped, cap it at 14.75 hours
    if (project.shipped !== true && cappedHours > 14.75) {
      cappedHours = 14.75;
    }
    
    return cappedHours;
  }, [projectId, projects]);
}

export default function Bay() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Early return if not authenticated
  if (status === "loading") return <Loading />
  if (status === "unauthenticated") {
    return <AccessDeniedHaiku />;
  }

  return (
    <ReviewModeProvider>
      <BayWithReviewMode session={session} status={status} router={router} />
    </ReviewModeProvider>
  );
}

function BayWithReviewMode({ session, status, router }: { 
  session: any; 
  status: string;
  router: any;
}) {
  console.log('[DEBUG] BayWithReviewMode render');

  // Track if we've loaded projects for this user
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [totalHours, setTotalHours] = useState<number>(0);
  const [isProjectCreateModalOpen, setIsProjectCreateModalOpen] = useState<boolean>(false);
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState<boolean>(false);
  const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState<boolean>(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState<boolean>(false);
  const [projects, setProjectsRaw] = useState<ProjectType[]>([]);
  const [hackatimeProjects, setHackatimeProjects] = useState<Record<string, string>>({});
  const [projectHours, setProjectHours] = useState<Record<string, number>>({});
  const [isLoadingHackatime, setIsLoadingHackatime] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectType | null>(null);
  const [linkedHackatimeProjects, setLinkedHackatimeProjects] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const { isReviewMode } = useReviewMode();
  
  // Create a wrapped setProjects function that logs when it's called
  const setProjects = useCallback((updater: React.SetStateAction<ProjectType[]>) => {
    console.log('[DEBUG] setProjects called with:', typeof updater === 'function' ? 'function updater' : 'value updater');
    setProjectsRaw(updater);
  }, []);
  
  // Always call this hook in the same place, regardless of selected project
  const selectedProjectHours = useProjectHours(selectedProjectId, projects);
  
  // Check if user is admin
  const isAdmin = session?.user?.role === 'Admin' || session?.user?.isAdmin === true;

  // Load Hackatime projects once when component mounts or user changes
  useEffect(() => {
    const userId = session?.user?.id;
    const hackatimeId = session?.user?.hackatimeId;
    console.log('[DEBUG] Hackatime useEffect triggered', { userId, loadedForUserId, hackatimeId });

    // Skip if no user ID or we've already loaded for this user
    if (!userId || userId === loadedForUserId) {
      console.log('[DEBUG] Skipping load:', !userId ? 'no user ID' : 'already loaded for this user');
      return;
    }

    // Check Hackatime setup from session
    if (!hackatimeId) {
      console.log('[DEBUG] No Hackatime ID in session, redirecting to setup...');
      router.push('/bay/setup');
      return;
    }

    async function loadHackatimeProjects() {
      try {
        console.log('[DEBUG] Loading Hackatime projects for user:', userId);
        const projectsData = await getHackatimeProjects();
        
        // Ensure we have an array of projects
        const projects = Array.isArray(projectsData) ? projectsData : [];
        console.log(`[DEBUG] Received ${projects.length} Hackatime projects`);
        
        if (projects.length === 0) {
          console.log('[DEBUG] No projects found or invalid data received');
          setHackatimeProjects({});
          setProjectHours({});
          return;
        }
        
        // Create hours map (key: project name, value: hours)
        const hours = Object.fromEntries(
          projects.map((project: HackatimeProject) => [project.name, project.hours || 0])
        );
        
        console.log('[DEBUG] Hours map created with', Object.keys(hours).length, 'entries');
        
        // Create an array of projects with hours for sorting
        const projectsWithHours = projects.map((project: HackatimeProject) => ({
          name: project.name,
          hours: project.hours || 0
        }));
        
        // Sort by hours in descending order
        projectsWithHours.sort((a, b) => b.hours - a.hours);
        
        // Create the project names map with proper display
        const projectNames: Record<string, string> = {};
        projectsWithHours.forEach(project => {
          // Show hours in the dropdown display but store only the name as the value
          projectNames[`${project.hours}h ${project.name}`] = project.name;
        });
        
        console.log('[DEBUG] Project names map created with', Object.keys(projectNames).length, 'entries');
        
        setHackatimeProjects(projectNames);
        setProjectHours(hours);
        setLoadedForUserId(userId || null);
      } catch (error) {
        console.error('[DEBUG] Failed to load Hackatime projects:', error);
        // Set empty objects to prevent undefined errors
        setHackatimeProjects({});
        setProjectHours({});
      } finally {
        setIsLoadingHackatime(false);
      }
    }

    loadHackatimeProjects();
  }, [session?.user?.id, loadedForUserId, router, session?.user?.hackatimeId]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
  };

  const [projectCreateState, projectCreateFormAction, projectCreatePending] = useActionState((state: FormSave, payload: FormData) => new Promise<FormSave>((resolve, reject) => {
    toast.promise(createProjectAction(state, payload), {
      loading: "Creating project...",
      error: () => { reject(); return "Failed to create new project" },
      success: async data => {
        if (!data?.data) {
          reject(new Error('No project data received'));
          return "Failed to create new project";
        }
        
        // Store the successful form submission
        resolve(data as FormSave);
        setIsProjectCreateModalOpen(false);
        
        // Get the project ID from the created project
        const createdProject = data.data as ProjectType;
        const projectID = createdProject.projectID;
        
        console.log(`[DEBUG] Project created successfully with ID: ${projectID}`);
        
        // Instead of directly adding the project to state, refresh all projects
        // This ensures we get the complete project data including correct hours
        try {
          console.log('[DEBUG] Refreshing projects list to get updated hours');
          const response = await fetch("/api/projects");
          if (response.ok) {
            const refreshedProjects = await response.json();
            setProjects(refreshedProjects);
            console.log('[DEBUG] Projects refreshed successfully with updated data');
          } else {
            console.error('[DEBUG] Failed to refresh projects after creation');
            // Fall back to adding the newly created project
            setProjects(prev => [...prev, createdProject]);
          }
        } catch (error) {
          console.error('[DEBUG] Error refreshing projects:', error);
          // Fall back to adding the newly created project
          setProjects(prev => [...prev, createdProject]);
        }
        
        return "Created new project"
      }
    });
  }), {
    errors: undefined,
    data: {
      name: "",
      description: "",
      hackatime: "",
      codeUrl: "",
      playableUrl: "",
      screenshot: "",
      userId: ""
    },
  });

  const [initialEditState, setInitialEditState] = useState<Partial<ProjectType>>({});

  const [projectEditState, projectEditFormAction, projectEditPending] = useActionState((state: FormSave, payload: FormData) => new Promise<FormSave>((resolve, reject) => {
    toast.promise(editProjectAction(state, payload), {
      loading: "Editing project...",
      error: () => { reject(); return "Failed to edit project" },
      success: data => {
        if (!data?.data) {
          reject(new Error('No project data received'));
          return "Failed to edit project";
        }
        resolve(data as FormSave);
        setIsProjectEditModalOpen(false);
        // Update the projects list with edited project
        setProjects(prev => prev.map(p => 
          p.projectID === (data.data as ProjectType).projectID ? (data.data as ProjectType) : p
        ));
        return "Edited project"
      }
    });
  }), {
    errors: undefined,
    data: {
      name: "",
      description: "",
      hackatime: "",
      codeUrl: "",
      playableUrl: "",
      screenshot: "",
      userId: "",
      projectID: ""
    }
  });

  async function getUserProjects() {
    const response = await fetch("/api/projects");
    const data = await response.json();
    setProjects(data);
  }

  // Fetch all user projects
  useEffect(() => {
    getUserProjects();
  }, []);
  
  // Fetch all linked Hackatime projects across all users
  useEffect(() => {
    async function fetchLinkedHackatimeProjects() {
      try {
        const response = await fetch('/api/hackatime/linked-projects');
        if (response.ok) {
          const data = await response.json();
          setLinkedHackatimeProjects(data.linkedProjects || []);
        } else {
          console.error('Failed to fetch linked Hackatime projects');
        }
      } catch (error) {
        console.error('Error fetching linked Hackatime projects:', error);
      }
    }
    
    fetchLinkedHackatimeProjects();
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip keyboard shortcuts on mobile
      if (isMobile) return;
      
      // Skip if key press is inside a form input (when typing)
      const target = e.target as HTMLElement;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || 
                       target.isContentEditable || 
                       target.getAttribute('role') === 'textbox';
      
      if (isTyping) return;
      
      if (e.key === 'Escape') {
        // First close any open modal
        if (isProjectCreateModalOpen) {
          setIsProjectCreateModalOpen(false);
        } else if (isProjectEditModalOpen) {
          setIsProjectEditModalOpen(false);
        } else if (selectedProjectId) {
          // Then deselect any selected project
          setSelectedProjectId(null);
        }
      }
      // The 'e' key handler has been removed to consolidate editing interfaces
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProjectId, isProjectEditModalOpen, isProjectCreateModalOpen, isMobile, projects]);

  // This useEffect watches for changes to selectedProjectId and initialEditState
  // and ensures the project edit form fields are properly synchronized
  useEffect(() => {
    if (selectedProjectId && initialEditState.projectID) {
      // Update projectEditState with initialEditState values
      projectEditState.data = {
        ...projectEditState.data,
        name: initialEditState.name || "",
        description: initialEditState.description || "",
        hackatime: initialEditState.hackatime || "",
        codeUrl: initialEditState.codeUrl || "",
        playableUrl: initialEditState.playableUrl || "",
        screenshot: initialEditState.screenshot || "",
        userId: initialEditState.userId || "",
        projectID: initialEditState.projectID || "",
        viral: initialEditState.viral || false,
        shipped: initialEditState.shipped || false,
        in_review: initialEditState.in_review || false
      };
      
      // console.log("Project edit state synchronized:", {
      //   selectedProjectId,
      //   initialEditState,
      //   projectEditState
      // });
    }
  }, [selectedProjectId, initialEditState, projectEditState]);

  // Update total hours whenever projects or projectHours changes
  useEffect(() => {
    console.log('[DEBUG] Total hours calculation useEffect triggered', { 
      projectsLength: projects.length, 
      projectHoursKeys: Object.keys(projectHours).length 
    });
    
    // Only count hours from projects that are in the projects list
    const total = projects.reduce((sum, project) => {
      // If project is viral, it automatically counts as 15 hours
      if (project.viral) {
        return sum + 15;
      }
      
      // Get hours using our helper function
      let hours = getProjectHackatimeHours(project);
      
      // Cap hours per project at 15
      let cappedHours = Math.min(hours, 15);
      
      // If the project is not shipped, cap it at 14.75 hours
      if (!project.shipped && cappedHours > 14.75) {
        cappedHours = 14.75;
      }
      
      return sum + cappedHours;
    }, 0);
    
    // Calculate percentage (0-100)
    const percentage = Math.min(Math.round((total / 60) * 100), 100);
    
    console.log('[DEBUG] Setting totalHours to', percentage);
    setTotalHours(percentage);
  }, [projects, projectHours]);

  // Calculate total hours from shipped, viral, and other projects
  const calculateProgressSegments = (): ProgressSegment[] => {
    // Calculate hours from each type of project
    let shippedHours = 0;
    let viralHours = 0;
    let otherHours = 0;

    if (!projects || !Array.isArray(projects)) {
      console.warn('Projects is null, undefined, or not an array:', projects);
      return [{ value: 100, color: '#e5e7eb', tooltip: 'No projects found', status: 'pending' }];
    }

    projects.forEach(project => {
      // Skip null or undefined projects
      if (!project) return;
      
      // Get hours using our helper function
      const hours = getProjectHackatimeHours(project);
      
      // Cap hours per project
      let cappedHours = Math.min(hours, 15);
      
      // If the project is viral, it counts as 15 hours
      if (project?.viral === true) {
        viralHours += 15;
      } 
      // If it's shipped but not viral
      else if (project?.shipped === true) {
        shippedHours += cappedHours;
      } 
      // Not shipped and not viral
      else {
        // Cap non-shipped projects at 14.75 hours
        otherHours += Math.min(cappedHours, 14.75);
      }
    });

    // Calculate total hours (capped at 60 for percentages)
    const totalHours = Math.min(shippedHours + viralHours + otherHours, 60);
    
    // Convert hours to percentages (based on 60-hour goal)
    const shippedPercentage = (shippedHours / 60) * 100;
    const viralPercentage = (viralHours / 60) * 100;
    const otherPercentage = (otherHours / 60) * 100;
    
    // Total progress percentage (capped at 100%)
    const totalPercentage = Math.min((totalHours / 60) * 100, 100);
    
    // Create segments array
    const segments: ProgressSegment[] = [];
    
    // Add shipped segment if there are hours
    if (shippedHours > 0) {
      segments.push({
        value: shippedPercentage,
        color: '#10b981', // Green
        label: 'Shipped',
        tooltip: `${shippedHours.toFixed(1)} hours from shipped projects`,
        animated: false,
        status: 'completed'
      });
    }
    
    // Add viral segment if there are hours
    if (viralHours > 0) {
      segments.push({
        value: viralPercentage,
        color: '#f59e0b', // Gold/Yellow
        label: 'Viral',
        tooltip: `${viralHours.toFixed(1)} hours from viral projects`,
        animated: false,
        status: 'completed'
      });
    }
    
    // Add other segment if there are hours
    if (otherHours > 0) {
      segments.push({
        value: otherPercentage,
        color: '#3b82f6', // Blue
        label: 'In Progress',
        tooltip: `${otherHours.toFixed(1)} hours from in-progress projects`,
        animated: true,
        status: 'in-progress'
      });
    }
    
    // Add remaining segment if total < 100%
    if (totalPercentage < 100) {
      segments.push({
        value: 100 - totalPercentage,
        color: '#e5e7eb', // Light gray
        tooltip: 'Remaining progress needed',
        status: 'pending'
      });
    }
    
    return segments;
  };

  // Add a function to calculate the total raw hours before component return
  const calculateTotalRawHours = () => {
    if (!projects || !Array.isArray(projects)) {
      return 0;
    }
    
    return projects.reduce((sum, project) => {
      // Skip null or undefined projects
      if (!project) return sum;
      
      // Get the raw hours before any capping using our helper
      const hours = getProjectHackatimeHours(project);
      return Math.round(sum + hours);
    }, 0);
  };

  // Shared helper function for case-insensitive hackatime matching
  const findMatchingHackatimeKey = (projectHackatime: string | undefined): string | null => {
    if (!projectHackatime) return null;
    if (!projectHours) return null;
    
    // First try direct match
    if (projectHours[projectHackatime] !== undefined) {
      return projectHackatime;
    }
    
    try {
      // Try case-insensitive match if direct match fails
      const lowerHackatime = projectHackatime.toLowerCase();
      const keys = Object.keys(projectHours || {});
      const matchingKey = keys.find(key => 
        key && typeof key === 'string' && key.toLowerCase() === lowerHackatime
      );
      
      return matchingKey || null;
    } catch (error) {
      console.error('Error in findMatchingHackatimeKey:', error);
      return null;
    }
  };
  
  // Helper to get project hours with our matching logic
  const getProjectHackatimeHours = (project: ProjectType): number => {
    console.log(`[DEBUG] getProjectHackatimeHours called for project: ${project?.name}`);
    
    // Safety check for null/undefined project
    if (!project) return 0;
    
    // Use hoursOverride if available
    if (typeof project.hoursOverride === 'number' && project.hoursOverride !== null) {
      console.log(`[DEBUG] Using hoursOverride value: ${project.hoursOverride}`);
      return project.hoursOverride;
    }
    
    // Otherwise use raw hours from hackatime
    if (!project.hackatime) {
      console.log(`[DEBUG] No hackatime project linked, using rawHours: ${project.rawHours || 0}`);
      return project.rawHours || 0;
    }
    
    const matchingKey = findMatchingHackatimeKey(project.hackatime);
    console.log(`[DEBUG] Hackatime matching key: ${matchingKey}, hours: ${matchingKey ? projectHours[matchingKey] : 'not found'}`);
    
    return matchingKey && projectHours[matchingKey] ? projectHours[matchingKey] : (project.rawHours || 0);
  };

  // Effect to track when selectedProjectId changes
  useEffect(() => {
    console.log('[DEBUG] selectedProjectId changed to:', selectedProjectId);
  }, [selectedProjectId]);

  return (
    <div className={styles.container}>
      <div className={styles.progressSection}>
        <div className="flex items-center justify-between w-full max-w-xl mx-auto py-1 md:py-2">
          <div className="flex-grow px-4 sm:px-0">
            <div className="flex items-center justify-center gap-3">
              <Tooltip content={`You've built ${projects.length} project${projects.length !== 1 ? 's' : ''}, and grinded ${calculateTotalRawHours()} hour${calculateTotalRawHours() !== 1 ? 's' : ''} thus far`}>
                <span className="text-4xl md:text-6xl flex items-center">👤</span>
              </Tooltip>
              <div 
                className="flex-grow cursor-pointer mt-5" 
                onClick={() => setIsProgressModalOpen(true)}
                title="When this progress bar reaches 100%, you're eligible for going to the island!"
              >
                <MultiPartProgressBar 
                  segments={calculateProgressSegments()}
                  max={100}
                  height={10}
                  rounded={true}
                  showLabels={false}
                  tooltipPosition="top"
                />
                <div className="text-center">
                  <h3 className="font-medium text-base">
                    {totalHours}%
                  </h3>
                </div>
              </div>
              <Tooltip content="Your prize - a fantastic island adventure with friends">
                <span className="text-4xl md:text-6xl flex items-center">🏝️</span>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress Information Modal */}
      <Modal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        title="Progress Information"
        okText="Got it!"
      >
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-3">Your Journey to Shipwrecked</h3>
          <p className="mb-4">
            The progress bar shows your completion percentage towards the 60-hour goal required to qualify for Shipwrecked.
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-2">Progress Bar Legend:</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#10b981' }}></span>
                <strong>Green:</strong> Hours from shipped projects (projects marked as "shipped")
              </li>
              <li>
                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#f59e0b' }}></span>
                <strong>Gold:</strong> Hours from viral projects
              </li>
              <li>
                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#3b82f6' }}></span>
                <strong>Blue:</strong> Hours from in-progress projects (not yet shipped or viral)
              </li>
              <li>
                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#e5e7eb' }}></span>
                <strong>Gray:</strong> Remaining progress needed to reach 100%
              </li>
            </ul>
            <p className="mt-3 text-sm text-gray-600">
              Hover over each segment in the progress bar to see the exact hours contributed by each category.
            </p>
          </div>
          
          {/* <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-2">How We Calculate Your Progress:</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                We track the total development hours from all your Hackatime projects listed in The Bay
              </li>
              <li>
                <strong>Each project is capped at 15 hours maximum</strong> contribution toward your total
              </li>
              <li>
                <strong>Viral projects automatically count for the full 15 hours</strong>, regardless of actual tracked time
              </li>
              <li>
                Projects that are not marked as "shipped" are capped at 14.75 hours
              </li>
              <li>
                Only hours from projects you've added to The Bay count toward your progress
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-2">Calculation Breakdown:</h4>
            <ol className="list-decimal pl-5 space-y-3">
              <li className="pb-1">
                <span className="font-semibold block mb-1">Step 1: Calculate hours for each project</span>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li><strong>If project is viral:</strong> Count as 15 hours</li>
                  <li><strong>If not viral:</strong> Take tracked hours (capped at 15 hours)</li>
                  <li><strong>If not shipped:</strong> Cap at 14.75 hours maximum</li>
                </ul>
              </li>
              <li className="pb-1">
                <span className="font-semibold block mb-1">Step 2: Calculate total hours</span>
                <div className="text-sm">
                  Add up the hours from all projects to get your total hours
                </div>
                <div className="font-mono bg-gray-100 p-2 my-1 rounded-md text-sm">
                  Total Hours = Project1 Hours + Project2 Hours + ... + ProjectN Hours
                </div>
              </li>
              <li className="pb-1">
                <span className="font-semibold block mb-1">Step 3: Calculate percentage</span>
                <div className="text-sm">
                  Divide your total hours by 60 (the goal) and multiply by 100
                </div>
                <div className="font-mono bg-gray-100 p-2 my-1 rounded-md text-sm">
                  Percentage = (Total Hours ÷ 60) × 100%
                </div>
                <div className="text-sm">
                  The final percentage is capped at 100%
                </div>
              </li>
            </ol>
            <div className="mt-3 text-sm bg-blue-50 p-2 rounded-md">
              <span className="font-semibold block">Example:</span>
              <p>If you have 3 projects:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Project 1: Viral (automatically 15 hours)</li>
                <li>Project 2: 20 hours tracked but not viral (capped at 15 hours)</li>
                <li>Project 3: 10 hours tracked, not shipped (10 hours)</li>
              </ul>
              <p className="mt-1">Total Hours = 15 + 15 + 10 = 40 hours</p>
              <p>Percentage = (40 ÷ 60) × 100% = 66.7% (rounded to 67%)</p>
            </div>
          </div> */}
          
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-2">Requirements for Shipwrecked:</h4>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Complete at least 60 hours of development time (roughly 15 hours per project) and ship 4 fully deployed projects
              </li>
              <li>
                Make at least one of your projects go viral according to our <a href="/info/go-viral" className="text-blue-600 hover:underline">defined criteria</a>
              </li>
            </ol>
          </div>
          
          <p>
            Your current progress: <span className="font-bold">{totalHours}%</span> toward the 60-hour requirement
          </p>
        </div>
      </Modal>
      
      <div className={styles.content}>
        <div className={styles.projectList}>
          <div className="mt-2 md:mt-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Your Projects</h2>
              <div className="flex items-center gap-2">
                <Tooltip content="Link projects from hackatime.hackclub.com to track your journey">
                  <button 
                    className="p-2 bg-gray-900 rounded-full text-white hover:bg-gray-700 transition-colors"
                    onClick={() => setIsProjectCreateModalOpen(true)}
                  >
                    <Icon glyph="plus" size={24} />
                  </button>
                </Tooltip>
              </div>
            </div>
            
            {/* Review Mode Banner */}
            {isReviewMode && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4 rounded-r">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon glyph="view" size={20} className="text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Review Mode Active:</strong> You can now add and delete reviews on projects.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-sm text-gray-500 mb-2">
              <p className="hidden md:block">
                Click a project to select it. Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> to close.
              </p>
              <p className="md:hidden">
                Tap a project to view details.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow">
              {useMemo(() => {
                console.log('[DEBUG] Memoizing project list rendering');
                
                return projects
                  .sort((a, b) => {
                    // Use hoursOverride if set, otherwise rawHours
                    const hoursA = typeof a.hoursOverride === 'number' ? a.hoursOverride : a.rawHours || 0;
                    const hoursB = typeof b.hoursOverride === 'number' ? b.hoursOverride : b.rawHours || 0;
                    return hoursB - hoursA;
                  })
                  .map((project, index) => (
                    <Project
                      key={project.projectID}
                      {...project}
                      rawHours={project.rawHours}
                      hoursOverride={project.hoursOverride === null ? undefined : project.hoursOverride}
                      viral={!!project.viral}
                      shipped={!!project.shipped}
                      in_review={!!project.in_review}
                      editHandler={(project) => {
                        // Check if the edit request is coming from the edit button
                        const isEditRequest = 'isEditing' in project;
                        
                        // Only process edits from explicit button clicks (isEditing flag),
                        // No longer supporting row clicks or keyboard shortcuts for editing
                        if (!isEditRequest) {
                          // For non-edit clicks on project row, only handle selection
                          if (isMobile) {
                            setSelectedProjectId(project.projectID);
                            setInitialEditState(project);
                            setIsProjectDetailModalOpen(true);
                          } else if (selectedProjectId === project.projectID) {
                            setSelectedProjectId(null);
                          } else {
                            setSelectedProjectId(project.projectID);
                            setInitialEditState(project);
                          }
                          return;
                        }
                        
                        // Process edit button clicks
                        setSelectedProjectId(project.projectID);
                        setInitialEditState(project);
                        setIsProjectEditModalOpen(true);
                      }}
                      selected={!isMobile && selectedProjectId === project.projectID}
                    />
                  ));
              }, [projects, selectedProjectId, isMobile])}
              {projects.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No projects yet. Click "Add Project" to get started!
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Project Detail or Edit Form - Desktop */}
        {selectedProjectId && !isMobile && (
          <>
            {isProjectEditModalOpen ? (
              // Edit Form
              <div className={`${styles.editForm} relative`}>
                <div className="flex justify-between items-center border-b sticky pb-2 top-0 bg-white z-10">
                  <h2 className="text-2xl font-bold">Edit Project</h2>
                  <button
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                    onClick={() => {
                      setIsProjectEditModalOpen(false);
                    }}
                    aria-label="Close project edit form"
                  >
                    <span className="text-xl leading-none">&times;</span>
                  </button>
                </div>
                <form action={projectEditFormAction} className="overflow-y-scroll max-h-[95%]">
                  <span className="invisible h-0 w-0 overflow-hidden [&_*]:invisible [&_*]:h-0 [&_*]:w-0 [&_*]:overflow-hidden">
                    <FormInput
                      fieldName='projectID'
                      state={projectEditState}
                      placeholder='projectID'
                      defaultValue={initialEditState.projectID}
                    >
                      {""}
                    </FormInput>
                  </span>
                  <div className="mb-5 bg-gray-50 p-4 rounded-lg">
                    <FormInput
                      fieldName='name'
                      placeholder='Project Name'
                      state={projectEditState}
                      required
                      value={initialEditState.name}
                      onChange={(e) => {
                        setInitialEditState((prev: typeof initialEditState) => ({
                          ...prev,
                          name: e.target.value
                        }));
                      }}
                    >
                      Project Name
                    </FormInput>
                    <FormInput
                      fieldName='description'
                      placeholder='Description'
                      state={projectEditState}
                      value={initialEditState.description}
                      onChange={(e) => {
                        setInitialEditState((prev: typeof initialEditState) => ({
                          ...prev,
                          description: e.target.value
                        }));
                      }}
                      required
                    >
                      Description
                    </FormInput>
                  </div>
                  
                  <div className="mb-5 bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Project URLs</h3>
                    <FormInput
                      fieldName='codeUrl'
                      placeholder='Code URL'
                      state={projectEditState}
                      value={initialEditState.codeUrl}
                      onChange={(e) => {
                        setInitialEditState((prev: typeof initialEditState) => ({
                          ...prev,
                          codeUrl: e.target.value
                        }));
                      }}
                    >
                      Code URL
                    </FormInput>
                    <FormInput
                      fieldName='playableUrl'
                      placeholder='Playable URL'
                      state={projectEditState}
                      value={initialEditState.playableUrl}
                      onChange={(e) => {
                        setInitialEditState((prev: typeof initialEditState) => ({
                          ...prev,
                          playableUrl: e.target.value
                        }));
                      }}
                    >
                      Playable URL
                    </FormInput>
                    <FormInput
                      fieldName='screenshot'
                      placeholder='Screenshot URL'
                      state={projectEditState}
                      value={initialEditState.screenshot}
                      onChange={(e) => {
                        setInitialEditState((prev: typeof initialEditState) => ({
                          ...prev,
                          screenshot: e.target.value
                        }));
                      }}
                    >
                      Screenshot URL
                    </FormInput>
                  </div>
                  
                  <div className="mb-5 bg-gray-50 p-4 rounded-lg">
                    <FormSelect 
                      fieldName='hackatime'
                      placeholder={
                        isLoadingHackatime 
                          ? 'Loading projects...' 
                          : Object.keys(hackatimeProjects).length === 0
                            ? 'No Hackatime projects found'
                            : 'Select a Hackatime Project'
                      }
                      required
                      values={hackatimeProjects}
                      {...(initialEditState.hackatime && { 
                        defaultValue: initialEditState.hackatime
                      })}
                      disabled={true}
                    >
                      Your Hackatime Project
                    </FormSelect>
                  </div>
                  
                  <div className="mb-5 bg-gray-50 p-4 rounded-lg flex flex-wrap gap-2">
                    <label className="flex items-center text-sm text-gray-600 mr-4 cursor-not-allowed">
                      <input type="checkbox" checked={!!initialEditState.shipped} readOnly disabled /> Shipped
                    </label>
                    <label className="flex items-center text-sm text-gray-600 mr-4 cursor-not-allowed">
                      <input type="checkbox" checked={!!initialEditState.viral} readOnly disabled /> Viral
                    </label>
                    <label className="flex items-center text-sm text-gray-600 mr-4 cursor-not-allowed">
                      <input type="checkbox" checked={!!initialEditState.in_review} readOnly disabled /> In Review
                    </label>
                  </div>
                  
                  {/* Debug info */}
                  <div className="mb-5 p-3 border border-gray-200 rounded-lg text-xs text-gray-500" style={{ display: 'none' }}>
                    <pre>
                      {JSON.stringify({
                        initialEditState,
                        projectEditState: projectEditState.data
                      }, null, 2)}
                    </pre>
                  </div>
                  
                  {/* Fixed position button that stays at the bottom */}
                  <div className="sticky bottom-0 left-0 right-0 p-4 p-4 mt-4 bg-white border-t border-gray-200 z-20">
                    <button
                      type="submit"
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors focus:outline-none flex items-center justify-center gap-2"
                      disabled={projectEditPending || isLoadingHackatime}
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Project Detail View
              (() => {
                console.log(`[DEBUG] Desktop ProjectDetail wrapper render - selectedProjectId: ${selectedProjectId}`);
                
                const selectedProject = projects.find(p => p.projectID === selectedProjectId);
                
                if (!selectedProject) {
                  // If the project doesn't exist anymore, show a message and clear selection
                  setTimeout(() => setSelectedProjectId(null), 0);
                  return (
                    <div className={`${styles.editForm}`}>
                      <div className="flex justify-center items-center h-64">
                        <div className="text-center">
                          <h3 className="text-xl font-medium text-gray-500 mb-2">Project not found</h3>
                          <p className="text-gray-400">The project may have been deleted</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Otherwise show the project details
                return (
                  <ProjectDetail 
                    key={`project-detail-${selectedProject.projectID}`} // Add key to force proper re-rendering
                    project={selectedProject}
                    onEdit={() => {
                      // Make sure to set initialEditState with the full project data
                      const projectWithDefaults = {
                        ...selectedProject,
                        codeUrl: selectedProject.codeUrl || "",
                        playableUrl: selectedProject.playableUrl || "",
                        screenshot: selectedProject.screenshot || "",
                        viral: !!selectedProject.viral,
                        shipped: !!selectedProject.shipped,
                        in_review: !!selectedProject.in_review,
                        rawHours: selectedProject.rawHours,
                        hoursOverride: selectedProject.hoursOverride
                      };
                      
                      console.log("[DEBUG] Opening edit form with data:", projectWithDefaults);
                      
                      // Update the form state
                      setInitialEditState(projectWithDefaults);
                      
                      // Wait for state to be updated before showing the form
                      setTimeout(() => {
                        setIsProjectEditModalOpen(true);
                      }, 0);
                    }}
                    setProjects={(updater) => {
                      console.log("[DEBUG] ProjectDetail calling setProjects");
                      // Use setTimeout to break the render cycle
                      setTimeout(() => {
                        setProjects(updater);
                      }, 0);
                    }}
                  />
                );
              })()
            )}
          </>
        )}
        {/* Create Project Modal */}
        <ProjectModal
          isOpen={isProjectCreateModalOpen}
          setIsOpen={setIsProjectCreateModalOpen}
          formAction={projectCreateFormAction}
          state={projectCreateState}
          pending={projectCreatePending}
          modalTitle='Create New Project!'
          hackatimeProjects={hackatimeProjects}
          isLoadingHackatime={isLoadingHackatime}
          hideFooter={true}
          existingProjects={projects}
          linkedHackatimeProjects={linkedHackatimeProjects}
          isAdmin={isAdmin}
        />
        {/* Project Detail Modal - Mobile Only */}
        <Modal
          isOpen={isMobile && isProjectDetailModalOpen}
          onClose={() => setIsProjectDetailModalOpen(false)}
          title="Project Details"
          hideFooter={true}
        >
          {(() => {
            const selectedProject = projects.find(p => p.projectID === selectedProjectId);
            
            // Always calculate contribution percentage using our custom hook
            // (which will be called consistently regardless of render path)
            const contributionPercentage = Math.round((selectedProjectHours / 60) * 100);
            
            if (!selectedProject) {
              return (
                <div className="flex justify-center items-center h-64">
                  <div className="text-center">
                    <h3 className="text-xl font-medium text-gray-500 mb-2">Project not found</h3>
                    <p className="text-gray-400">The project may have been deleted</p>
                  </div>
                </div>
              );
            }
            
            // Calculate total raw hours for the mobile view
            const totalRawHours = (selectedProject.hackatimeLinks || []).reduce(
              (sum, link: {id: string; hackatimeName: string; rawHours: number; hoursOverride?: number | null}) => 
                sum + (typeof link.rawHours === 'number' ? link.rawHours : 0),
              0
            );
            
            return (
              <div className="p-2 sm:p-4"> {/* Reduced padding on mobile */}
                {/* Review Mode Banner */}
                {isReviewMode && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-2 sm:p-3 mb-3 rounded-r">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Icon glyph="view" size={20} className="text-blue-500" />
                      </div>
                      <div className="ml-2">
                        <p className="text-sm text-blue-700">
                          <strong>Review Mode Active:</strong> You can now add and delete reviews on this project.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-5 pb-8">
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                    <p className="text-base text-gray-900">{selectedProject.description || "No description provided."}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <div className="text-center text-sm">
                      <p>This project contributes <strong>{selectedProjectHours}</strong> hour{selectedProjectHours !== 1 && 's'} (<strong>{contributionPercentage}%</strong>) toward your island journey</p>
                      <ProjectStatus 
                        viral={selectedProject.viral} 
                        shipped={selectedProject.shipped}
                        in_review={selectedProject.in_review}
                      />
                    </div>
                  </div>
                  
                                      {/* Project Hours Details Section */}
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-3 sm:mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Total Hours</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-500">Raw Hours</span>
                          <p className="text-lg font-semibold mt-1">{totalRawHours.toFixed(1)}h</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Override</span>
                          <p className="text-lg font-semibold mt-1">
                            {(() => {
                              // Calculate if any links have overrides
                              const hasAnyOverride = (selectedProject.hackatimeLinks || []).some(link => 
                                link.hoursOverride !== undefined && link.hoursOverride !== null
                              );
                              
                              if (hasAnyOverride) {
                                // Sum up all hours, using overrides where available
                                const totalOverrideHours = (selectedProject.hackatimeLinks || []).reduce((sum, link) => {
                                  // Use override if available, otherwise use raw hours
                                  const hours = (link.hoursOverride === null || link.hoursOverride === undefined) ? 
                                    link.rawHours : 
                                    link.hoursOverride;
                                  
                                  return sum + (typeof hours === 'number' ? hours : 0);
                                }, 0);
                                
                                return `${totalOverrideHours.toFixed(1)}h`;
                              }
                              
                              return '—';
                            })()}
                          </p>
                        </div>
                      </div>
                                          
                    {/* Hackatime Links Section */}
                    {selectedProject.hackatimeLinks && selectedProject.hackatimeLinks.length > 0 && (
                      <div className="mt-3 sm:mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Hackatime Project Links</h4>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <table className="w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                                <th className="px-1 sm:px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Raw</th>
                                <th className="px-1 sm:px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Approved</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {selectedProject.hackatimeLinks.map((link) => (
                                <tr key={link.id}>
                                  <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 break-words">{link.hackatimeName}</td>
                                  <td className="px-1 sm:px-3 py-2 text-xs sm:text-sm text-gray-500 text-center">
                                    {typeof link.rawHours === 'number' ? `${link.rawHours}h` : '—'}
                                  </td>
                                  <td className="px-1 sm:px-3 py-2 text-xs sm:text-sm text-center text-blue-600">
                                    {link.hoursOverride !== undefined && link.hoursOverride !== null 
                                      ? `${link.hoursOverride}h` 
                                      : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Project Review Request for Mobile - only visible when NOT in review mode and not already in review */}
                  <ProjectReviewRequest
                    projectID={selectedProject.projectID}
                    isInReview={selectedProject.in_review}
                    isShipped={selectedProject.shipped}
                    isViral={selectedProject.viral}
                    onRequestSubmitted={(updatedProject, review) => {
                      // Update the project in the projects array
                      setProjects(prevProjects => 
                        prevProjects.map(p => 
                          p.projectID === selectedProject.projectID ? {...p, in_review: true} as ProjectType : p
                        )
                      );
                      
                      // Close the modal after successful submission
                      setTimeout(() => {
                        setIsProjectDetailModalOpen(false);
                        toast.success("Project submitted for review!");
                      }, 500);
                    }}
                  />
                  
                  {/* Project Flags Editor for Mobile - only visible in review mode */}
                  {isReviewMode && (
                    <div className="mt-4 pb-10"> {/* Added extra bottom padding */}
                      <ProjectFlagsEditor
                        projectID={selectedProject.projectID}
                        initialShipped={!!selectedProject.shipped}
                        initialViral={!!selectedProject.viral}
                        initialInReview={!!selectedProject.in_review}
                        hackatimeLinks={selectedProject.hackatimeLinks}
                        onChange={(flags: ProjectFlags) => {
                          console.log('[DEBUG] Mobile ProjectFlagsEditor onChange:', JSON.stringify(flags));
                          
                          // Update the project in the projects array using the same pattern
                          // that's used by the desktop ProjectDetail component
                          const projectToUpdate = projects.find(p => p.projectID === selectedProject.projectID);
                          if (projectToUpdate) {
                            // Make a deep copy of the project and apply updates
                            const updatedProjectData = {
                              ...projectToUpdate,
                              shipped: flags.shipped,
                              viral: flags.viral,
                              in_review: flags.in_review
                            };
                            
                            // Process hackatimeLinkOverrides if present
                            if (flags.hackatimeLinkOverrides) {
                              // Update hackatimeLinks with the new overrides
                              updatedProjectData.hackatimeLinks = (projectToUpdate.hackatimeLinks || []).map(link => {
                                const override = flags.hackatimeLinkOverrides?.[link.id];
                                if (override !== undefined) {
                                  return {
                                    ...link,
                                    hoursOverride: override === null ? undefined : override
                                  };
                                }
                                return link;
                              });
                              
                              // Check if at least one link has an override
                              const hasAnyOverride = updatedProjectData.hackatimeLinks.some(link => 
                                link.hoursOverride !== undefined && link.hoursOverride !== null
                              );
                              
                              if (hasAnyOverride) {
                                // Calculate new total hours override
                                const totalOverrideHours = updatedProjectData.hackatimeLinks.reduce(
                                  (sum, link) => {
                                    const hours = (link.hoursOverride === null || link.hoursOverride === undefined) ? 
                                      link.rawHours : link.hoursOverride;
                                    return sum + (typeof hours === 'number' ? hours : 0);
                                  }, 0
                                );
                                
                                console.log(`[DEBUG] Mobile: calculated total hours override: ${totalOverrideHours}`);
                                updatedProjectData.hoursOverride = totalOverrideHours;
                              } else {
                                updatedProjectData.hoursOverride = undefined;
                              }
                            }
                            
                            console.log('[DEBUG] Mobile: updating project with:', JSON.stringify(updatedProjectData));
                            
                            // Update the projects array
                            setProjects(prevProjects => 
                              prevProjects.map(p => 
                                p.projectID === selectedProject.projectID ? updatedProjectData as ProjectType : p
                              )
                            );
                          }
                        }}
                      />
                    </div>
                  )}
                  
                  {selectedProject.hackatime && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Hackatime Project</h3>
                      <p className="text-base text-gray-900">{selectedProject.hackatime}</p>
                    </div>
                  )}
                  
                  {/* Project Status section - only visible when NOT in review mode */}
                  {!isReviewMode && (
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 mb-3 col-span-2">Project Status</h3>
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${selectedProject.viral ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm text-gray-700">Viral</span>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${selectedProject.shipped ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm text-gray-700">Shipped</span>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${selectedProject.in_review ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm text-gray-700">In Review</span>
                      </div>
                    </div>
                  )}
                  
                  {(selectedProject.codeUrl || selectedProject.playableUrl) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Links</h3>
                      <div className="flex flex-col gap-2">
                        {selectedProject.codeUrl && (
                          <a 
                            href={selectedProject.codeUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-2"
                          >
                            <Icon glyph="github" size={16} />
                            View Code Repository
                          </a>
                        )}
                        {selectedProject.playableUrl && (
                          <a 
                            href={selectedProject.playableUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-2"
                          >
                            <Icon glyph="link" size={16} />
                            Try It Out
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedProject.screenshot && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Screenshot</h3>
                      <div className="relative mt-2 w-full h-64 rounded-lg border border-gray-200 overflow-hidden">
                        <ImageWithFallback
                          src={selectedProject.screenshot}
                          alt={`Screenshot of ${selectedProject.name}`}
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Project Reviews Section for Mobile */}
                  <ReviewSection 
                    projectID={selectedProject.projectID}
                    initialFlags={{
                      shipped: !!selectedProject.shipped,
                      viral: !!selectedProject.viral,
                      in_review: !!selectedProject.in_review
                    }}
                    onFlagsUpdated={(updatedProject) => {
                      // Create a new object with the updated flags
                      const updatedSelectedProject = {
                        ...selectedProject,
                        shipped: updatedProject.shipped,
                        viral: updatedProject.viral,
                        in_review: updatedProject.in_review
                      };
                      
                      // Update the project in the projects array
                      setProjects(prevProjects => 
                        prevProjects.map(p => 
                          p.projectID === selectedProject.projectID ? updatedSelectedProject : p
                        )
                      );
                    }}
                    rawHours={selectedProject.rawHours}
                    hackatimeLinks={selectedProject.hackatimeLinks}
                  />
                  
                  {/* Edit button at bottom */}
                  <div className="sticky bottom-0 left-0 right-0 p-4 mt-4 bg-white border-t border-gray-200 z-20">
                    {isReviewMode || !selectedProject.in_review ? (
                      <button
                        type="button"
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors focus:outline-none flex items-center justify-center gap-2"
                        onClick={() => {
                          setIsProjectDetailModalOpen(false);
                          
                          // Make sure to set initialEditState with the full project data
                          const projectWithDefaults = {
                            ...selectedProject,
                            codeUrl: selectedProject.codeUrl || "",
                            playableUrl: selectedProject.playableUrl || "",
                            screenshot: selectedProject.screenshot || "",
                            viral: !!selectedProject.viral,
                            shipped: !!selectedProject.shipped,
                            in_review: !!selectedProject.in_review,
                            rawHours: selectedProject.rawHours,
                            hoursOverride: selectedProject.hoursOverride
                          };
                          
                          // Update the form state
                          setInitialEditState(projectWithDefaults);
                          
                          // Wait for state to be updated before showing the form
                          setTimeout(() => {
                            setIsProjectEditModalOpen(true);
                          }, 100);
                        }}
                      >
                        Edit Project
                      </button>
                    ) : (
                      <div className="w-full py-3 text-center text-gray-500 italic bg-gray-100 rounded">
                        Cannot edit while in review
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
        {/* Edit Project Modal - Mobile Only */}
        <div className="md:hidden">
          {selectedProjectId && projects.find(p => p.projectID === selectedProjectId) && (
            <ProjectModal
              isOpen={isProjectEditModalOpen}
              setIsOpen={setIsProjectEditModalOpen}
              formAction={projectEditFormAction}
              state={projectEditState}
              pending={projectEditPending}
              modalTitle='Edit Project'
              hackatimeProjects={hackatimeProjects}
              isLoadingHackatime={isLoadingHackatime}
              projectID={selectedProjectId}
              isAdmin={isAdmin}
              linkedHackatimeProjects={linkedHackatimeProjects}
              {...(initialEditState as any)}
              existingProjects={projects}
            />
          )}
        </div>
        <Toaster richColors />
        {toastMessage && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setToastMessage(null)}
          />
        )}
        
        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteConfirmModalOpen}
          onClose={() => setIsDeleteConfirmModalOpen(false)}
          title="Delete Project?"
          hideFooter={true}
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete <span className="font-medium">{projectToDelete?.name}</span>?
            </p>
            <p className="text-gray-600 text-sm">
              This action cannot be undone. It will permanently delete the project and all associated data.
            </p>
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded focus:outline-none transition-colors"
                onClick={() => setIsDeleteConfirmModalOpen(false)}
              >
                Cancel
              </button>
              
              <button
                className="px-4 py-2 bg-gray-200 text-gray-500 cursor-not-allowed font-medium rounded focus:outline-none transition-colors"
                onClick={() => {
                  // Don't proceed if no project is selected
                  if (!projectToDelete) return;
                  
                  // Close the confirmation modal
                  setIsDeleteConfirmModalOpen(false);
                  
                  // Close the edit modal if it's open
                  setIsProjectEditModalOpen(false);
                  
                  // Show message that deletion is restricted
                  toast.error("Sorry, you cannot unlink your hackatime project from Shipwrecked.");
                }}
              >
                Delete Project
              </button>
            </div>
          </div>
        </Modal>
        {/* Project Edit Modal - Desktop Only */}
        <ProjectModal
          isOpen={isProjectEditModalOpen}
          setIsOpen={setIsProjectEditModalOpen}
          formAction={projectEditFormAction}
          state={projectEditState}
          pending={projectEditPending}
          modalTitle='Edit Project'
          hackatimeProjects={hackatimeProjects}
          isLoadingHackatime={isLoadingHackatime}
          hideFooter={true}
          existingProjects={projects}
          linkedHackatimeProjects={linkedHackatimeProjects}
          isAdmin={isAdmin}
          {...initialEditState}
        />
      </div>
    </div>
  );
}

type ProjectModalProps = Partial<ProjectType> & { 
  isOpen: boolean,
  setIsOpen: (isOpen: boolean) => void,
  formAction: (payload: FormData) => void,
  state: FormSave,
  pending: boolean,
  modalTitle: string,
  hackatimeProjects: Record<string, string>,
  isLoadingHackatime: boolean,
  hideFooter?: boolean,
  existingProjects?: ProjectType[],
  linkedHackatimeProjects?: string[],
  isAdmin?: boolean
}

function ProjectModal(props: ProjectModalProps): ReactElement {
  const isCreate = props.modalTitle?.toLowerCase().includes('create');
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState<boolean>(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  
  // Initialize selectedProjects when props change
  useEffect(() => {
    if (props.isOpen) {
      // If editing an existing project with hackatime, initialize the selection
      if (props.hackatime && typeof props.hackatime === 'string') {
        setSelectedProjects([props.hackatime]);
      } else {
        // Reset selections when opening a new modal
        setSelectedProjects([]);
      }
    }
  }, [props.isOpen, props.hackatime]);
  
  // Filter out already added projects for create mode
  const availableHackatimeProjects = useMemo(() => {
    if (!isCreate) {
      // When editing, just use the existing projects
      return props.hackatimeProjects;
    }
    
    // For creation - filter out projects that are already added by any user
    // Create a new filtered map for creating new projects
    const filtered: Record<string, string> = {};
    
    // Combine locally used projects with globally linked projects
    const usedHackatimeProjects = props.linkedHackatimeProjects || [];
    
    // Add only unused projects to the filtered map
    Object.entries(props.hackatimeProjects).forEach(([label, projectName]) => {
      if (!usedHackatimeProjects.includes(projectName)) {
        filtered[label] = projectName;
      }
    });
    
    return filtered;
  }, [isCreate, props.hackatimeProjects, props.linkedHackatimeProjects]);
  
  const handleDeleteConfirm = () => {
    // Close the confirmation modal
    setIsDeleteConfirmModalOpen(false);
    
    // Close the project modal
    props.setIsOpen(false);
    
         // Show message that deletion is restricted
     toast.error("Sorry, you cannot unlink your hackatime project from Shipwrecked.");
  };
  
  // Handle project selection/deselection
  const toggleProject = (projectName: string, e?: React.MouseEvent | React.ChangeEvent) => {
    // Prevent event bubbling if an event was passed
    if (e) {
      e.stopPropagation();
    }
    
    console.log('Toggling project:', projectName);
    setSelectedProjects(prev => 
      prev.includes(projectName)
        ? prev.filter(p => p !== projectName)
        : [...prev, projectName]
    );
  };
  
  // Handle form submission to include multiple projects
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Create a FormData object to add the selected projects
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // Remove any existing hackatime field (single selection)
    formData.delete('hackatime');
    
    // Add each selected project as a hackatimeProjects[] field
    selectedProjects.forEach(project => {
      formData.append('hackatimeProjects', project);
    });
    
    // If no projects selected and in create mode, show an error
    if (isCreate && selectedProjects.length === 0) {
      toast.error('Please select at least one Hackatime project');
      return;
    }
    
    // Call the form action with the updated FormData
    props.formAction(formData);
  };
  
  return (
    <>
      <Modal
        isOpen={props.isOpen}
        onClose={() => props.setIsOpen(false)}
        title={props.modalTitle}
        okText="Done"
        hideFooter={props.hideFooter || isCreate}
      >
        <form onSubmit={handleFormSubmit} className="relative">
          <span className="invisible h-0 w-0 overflow-hidden [&_*]:invisible [&_*]:h-0 [&_*]:w-0 [&_*]:overflow-hidden">
            <FormInput
              fieldName='projectID'
              state={props.state}
              placeholder='projectID'
              {...(props.projectID && { defaultValue: props.projectID})}
            >
              {""}
            </FormInput>
          </span>
          
          <div className="mb-5 bg-gray-50 p-4 rounded-lg">
            <FormInput
              fieldName='name'
              placeholder='Project Name'
              state={props.state}
              required
              {...(props.name && { defaultValue: props.name})}
            >
              Project Name
            </FormInput>
            <FormInput
              fieldName='description'
              placeholder='Description'
              state={props.state}
              {...(props.description && { defaultValue: props.description})}
              required
            >
              Description
            </FormInput>
          </div>
          
          {!isCreate && (
            <>
              <div className="mb-5 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Project URLs</h3>
                <FormInput
                  fieldName='codeUrl'
                  placeholder='Code URL'
                  state={props.state}
                  {...(props.codeUrl && { defaultValue: props.codeUrl})}
                >
                  Code URL
                </FormInput>
                <FormInput
                  fieldName='playableUrl'
                  placeholder='Playable URL'
                  state={props.state}
                  {...(props.playableUrl && { defaultValue: props.playableUrl})}
                >
                  Playable URL
                </FormInput>
                <FormInput
                  fieldName='screenshot'
                  placeholder='Screenshot URL'
                  state={props.state}
                  {...(props.screenshot && { defaultValue: props.screenshot})}
                >
                  Screenshot URL
                </FormInput>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-5 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-3 col-span-2">Project Status</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!props.viral} readOnly disabled /> Viral
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!props.shipped} readOnly disabled /> Shipped
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!props.in_review} readOnly disabled /> In Review
                </label>
              </div>
              
              {/* Delete Project Section - Disabled for all users in Bay */}
              <div className="mb-5 bg-gray-50 p-4 rounded-lg border-l-4 border-red-500">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Danger Zone</h3>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-200 text-gray-500 cursor-not-allowed font-medium rounded transition-colors focus:outline-none flex items-center gap-2"
                    disabled={true}
                  >
                    <Icon glyph="delete" size={16} />
                    <span>Delete Project</span>
                  </button>
                  
                  <p className="text-xs text-gray-500 italic">Sorry, you cannot unlink your hackatime project from Shipwrecked.</p>
                </div>
              </div>
            </>
          )}
          
          {isCreate && (
            <div className="mb-5 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Your Hackatime Projects 
                <span className="text-sm text-gray-500 ml-1 font-normal">(select one or more)</span>
              </h3>
              
              {props.isLoadingHackatime ? (
                <div className="py-3 text-center text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                  Loading projects...
                </div>
              ) : Object.keys(availableHackatimeProjects).length === 0 ? (
                <div className="py-3 text-center text-gray-500">
                  No Hackatime projects found
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md">
                  <div className="p-2">
                    {Object.entries(availableHackatimeProjects).map(([label, project]) => (
                      <div 
                        key={project} 
                        className={`flex items-center p-2 rounded-md mb-1 cursor-pointer hover:bg-gray-100 ${
                          selectedProjects.includes(project) ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                        onClick={(e) => toggleProject(project, e)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(project)}
                          onChange={(e) => toggleProject(project, e)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 mr-3"
                          // Add this to prevent the event from bubbling to the parent div
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-3 text-sm text-blue-600">
                Selected projects: {selectedProjects.length}
              </div>
              
              {/* Hidden input for backward compatibility */}
              {selectedProjects.length > 0 && (
                <input type="hidden" name="hackatime" value={selectedProjects[0]} />
              )}
            </div>
          )}
          
          {/* Fixed button at bottom of modal */}
          <div 
            className="sticky bottom-0 left-0 right-0 p-4 mt-4 bg-white border-t border-gray-200 z-10"
            style={{ bottom: "-6%"}}
          >
            <button
              type="submit"
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors focus:outline-none flex items-center justify-center gap-2"
              disabled={props.pending || props.isLoadingHackatime || (isCreate && selectedProjects.length === 0)}
            >
              {isCreate ? "Create Project" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmModalOpen}
        onClose={() => setIsDeleteConfirmModalOpen(false)}
        title="Delete Project?"
        hideFooter={true}
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete <span className="font-medium">{props.name}</span>?
          </p>
          <p className="text-gray-600 text-sm">
            This action cannot be undone. It will permanently delete the project and all associated data.
          </p>
          
          <div className="flex gap-3 justify-end mt-6">
            <button
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded focus:outline-none transition-colors"
              onClick={() => setIsDeleteConfirmModalOpen(false)}
            >
              Cancel
            </button>
            
            <button
              className="px-4 py-2 bg-gray-200 text-gray-500 cursor-not-allowed font-medium rounded focus:outline-none transition-colors"
              onClick={handleDeleteConfirm}
            >
              Delete Project
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
