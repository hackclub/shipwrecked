'use client';
import styles from './page.module.css';
import Modal from '@/components/common/Modal';
import Toast from '@/components/common/Toast';
import { useState, useEffect, useActionState, useContext, useMemo, ReactElement, useRef, useCallback } from 'react';
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
import Tooltip from '@/components/common/Tooltip';
import Link from 'next/link';
import Header from '@/components/common/Header';
import ProjectStatus from '@/components/common/ProjectStatus';
import { useIsMobile } from '@/lib/hooks';
import ReviewSection from '@/components/common/ReviewSection';
import { ReviewModeProvider, useReviewMode } from '@/app/contexts/ReviewModeContext';
import ProjectFlagsEditor, { ProjectFlags } from '@/components/common/ProjectFlagsEditor';
import ProjectReviewRequest from '@/components/common/ProjectReviewRequest';
import ImageWithFallback from '@/components/common/ImageWithFallback';
import CompleteReviewForm from '@/components/common/CompleteReviewForm';
import ProjectMetadataWarning from '@/components/common/ProjectMetadataWarning';
import { ensureHttps } from '@/lib/utils';
import IDPopup from '@/app/components/identity/IDPopup';

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
  const response = await fetch('/api/projects', {
    method: 'POST',
    body: formData
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

// Import shared calculation functions from lib
import { calculateProgressMetrics, getProjectHackatimeHours, ProgressMetrics } from '@/lib/project-client';

// Re-export for backward compatibility
export { calculateProgressMetrics, getProjectHackatimeHours };
export type { ProgressMetrics };

// Project Detail Component
function ProjectDetail({ 
  project, 
  projects,
  onEdit,
  setProjects
}: { 
  project: ProjectType, 
  projects: ProjectType[],
  onEdit: (project?: any) => void,
  setProjects: React.Dispatch<React.SetStateAction<ProjectType[]>>
}): ReactElement {
  const { isReviewMode } = useReviewMode();
  const { data: session } = useSession();
  const [projectFlags, setProjectFlags] = useState<ProjectFlags>({
    shipped: !!project.shipped,
    viral: !!project.viral,
    in_review: !!project.in_review
  });
  
  // Determine if editing is allowed based on review mode and project status
  const isEditingAllowed = isReviewMode || !projectFlags.in_review;
  
  // Check if current user is the project owner
  const isOwner = session?.user?.id === project.userId;
  
  // Update projectFlags when project prop changes
  useEffect(() => {
    setProjectFlags({
      shipped: !!project.shipped,
      viral: !!project.viral,
      in_review: !!project.in_review
    });
  }, [project]);
  
  // Calculate project's contribution percentage
  const getProjectHours = () => {
    // Safety check for null project
    if (!project) return 0;

  const allProjectsWithHours = projects
    .map(project => ({
      project,
      hours: getProjectHackatimeHours(project)
    }))
    .sort((a, b) => b.hours - a.hours);

  // Get top 4 projects for island percentage calculation
  const top4Projects = allProjectsWithHours.slice(0, 4);

  if (!top4Projects.find(x=>x.project.projectID === project.projectID))
	  return 0;

    // Get hours from project properties using the helper function
    const rawHours = getProjectHackatimeHours(project);
    
    // Cap hours per project at 15
    let cappedHours = Math.min(rawHours, 15);
    
    if (projectFlags?.viral === true) {
      return cappedHours;
    }
    
    // If the project is not shipped, cap it at 14.75 hours
    if (projectFlags?.shipped !== true && cappedHours > 14.75) {
      cappedHours = 14.75;
    }
    
    return cappedHours;
  };
  
  const projectHours = getProjectHours();
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
    setProjectFlags({
      shipped: !!updatedProject.shipped,
      viral: !!updatedProject.viral,
      in_review: !!updatedProject.in_review
    });
    
    // Also update the project in the projects array
    const updatedProjectData = {
      ...project,
      shipped: updatedProject.shipped,
      viral: updatedProject.viral,
      in_review: updatedProject.in_review
    };
    
    // Update the projects array
    setProjects(prevProjects => 
      prevProjects.map(p => 
        p.projectID === project.projectID ? updatedProjectData as ProjectType : p
      )
    );
  };
  
  // Track the current flag changes from the editor
  const [currentEditorFlags, setCurrentEditorFlags] = useState<ProjectFlags>(projectFlags);
  
  // Handle changes from the flag editor
  const handleFlagEditorChange = (flags: ProjectFlags) => {
    setCurrentEditorFlags(flags);
  };
  
  // console.log(`ProjectDetail rendering: ${project.name}, hours=${projectHours}, viral=${project.viral}, shipped=${project.shipped}`);
  
  return (
    <div className={`${styles.editForm} max-h-screen overflow-y-scroll`}>
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Project Hours</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">Raw Hackatime Hours</span>
              <p className="text-lg font-semibold mt-1">
                {project.hackatimeLinks && project.hackatimeLinks.length > 0 
                  ? `${project.hackatimeLinks.reduce((sum, link) => sum + (link.rawHours || 0), 0)}h`
                  : `${project.rawHours || 0}h`}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Approved Hackatime Hours</span>
              <p className="text-lg font-semibold mt-1">
                {(() => {
                  if (project.hackatimeLinks && project.hackatimeLinks.length > 0) {
                    const totalApproved = project.hackatimeLinks.reduce((sum, link) => {
                      return sum + (link.hoursOverride !== null && link.hoursOverride !== undefined ? link.hoursOverride : 0);
                    }, 0);
                    return totalApproved > 0 ? `${totalApproved}h` : '—';
                  } else {
                    return project.hoursOverride !== undefined && project.hoursOverride !== null 
                      ? `${project.hoursOverride}h` 
                      : '—';
                  }
                })()}
              </p>
            </div>
          </div>
        </div>
        {/* Project Review Request - only visible when NOT in review mode and not already in review */}
        <ProjectReviewRequest
          projectID={project.projectID}
          isInReview={projectFlags.in_review}
          isShipped={projectFlags.shipped}
          isViral={projectFlags.viral}
          codeUrl={project.codeUrl}
          playableUrl={project.playableUrl}
          screenshot={project.screenshot}
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
          onEditProject={() => {
            // Use the onEdit callback to communicate with parent
            onEdit({
              ...project,
              isEditing: true
            });
          }}
        />
        
        {/* Hackatime Project Links Section */}
        {project.hackatimeLinks && project.hackatimeLinks.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Hackatime Project Links
            </h3>
            <div className="bg-white rounded border">
              {/* Table Header */}
              <div className="grid grid-cols-3 gap-4 p-3 border-b bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div>PROJECT</div>
                <div className="text-center">RAW</div>
                <div className="text-center">APPROVED</div>
              </div>
              {/* Table Rows */}
              {project.hackatimeLinks.map((link, index) => (
                <div key={link.id} className="grid grid-cols-3 gap-4 p-3 border-b last:border-b-0 text-sm">
                  <div className="font-medium text-gray-900">{link.hackatimeName}</div>
                  <div className="text-center text-gray-600">{link.rawHours}h</div>
                  <div className="text-center">
                    {link.hoursOverride !== null && link.hoursOverride !== undefined ? (
                      <span className="text-blue-600 font-medium">{link.hoursOverride}h</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
                  href={ensureHttps(project.codeUrl)} 
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
                  href={ensureHttps(project.playableUrl)} 
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
          projectOwnerUserId={project.userId}
          initialFlags={projectFlags}
          onFlagsUpdated={handleFlagsUpdated}
          rawHours={project.rawHours}
        />
      </div>
    </div>
  );
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

export function BayWithReviewMode({ session, status, router, impersonationData }: { 
  session: any; 
  status: string;
  router: any;
  impersonationData?: {
    userId: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
    projects: ProjectType[];
  };
}) {
  // Track if we've loaded projects for this user
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [totalHours, setTotalHours] = useState<number>(0);
  const [isProjectCreateModalOpen, setIsProjectCreateModalOpen] = useState<boolean>(false);
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState<boolean>(false);
  const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState<boolean>(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState<boolean>(false);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [hackatimeProjects, setHackatimeProjects] = useState<Record<string, string>>({});
  const [projectHours, setProjectHours] = useState<Record<string, number>>({});
  const [isLoadingHackatime, setIsLoadingHackatime] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectType | null>(null);
  const isMobile = useIsMobile();
  const { isReviewMode } = useReviewMode();
  const [showIdentityPopup, setShowIdentityPopup] = useState(false);

  useEffect(() => {
    const getIdentity = async () => {
      const response = await fetch('/api/identity/me');
      const user = await fetch('/api/users/me');
      const userData = await user.json();
      const isAdmin = session.user.role === 'Admin' || session.user.isAdmin === true;
      if (userData?.identityToken || isAdmin) {
        const data = await response.json();
        if (data?.verification_status === 'verified' || data?.verification_status === 'pending' || isAdmin) {
          setShowIdentityPopup(false);
        } else {
          setShowIdentityPopup(true);
        } 
      } else {
        setShowIdentityPopup(true);
      }
    }

    if (status !== 'authenticated') return;
    getIdentity();

  }, [status]);

  // Check if user is admin
  const isAdmin = session?.user?.role === 'Admin' || session?.user?.isAdmin === true;

  // Handle chat enabled change - shared function for both desktop and mobile contexts
  const handleChatEnabledChange = (projectID: string, enabled: boolean) => {
    // Update the project in the projects array
    setProjects(prevProjects => 
      prevProjects.map(p => 
        p.projectID === projectID 
          ? { ...p, chat_enabled: enabled } as ProjectType 
          : p
      )
    );
  };

  // Calculate all progress metrics using centralized function
  const progressMetrics = useMemo(() => {
    return calculateProgressMetrics(projects);
  }, [projects]);
  
  // Extract currency separately to avoid object reference issues
  const currency = useMemo(() => progressMetrics.currency, [progressMetrics.currency]);
  
  // Extract percentage separately to avoid object reference issues
  const percentage = useMemo(() => progressMetrics.totalPercentage, [progressMetrics.totalPercentage]);

  // Animation state for clamshell value and percentage
  const [animatedClamshells, setAnimatedClamshells] = useState(0);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [isGlowing, setIsGlowing] = useState(false);
  const animationRef = useRef<number | null>(null);
  const lastCurrency = useRef<number>(0);
  const currentCurrency = useRef<number>(0);
  const lastPercentage = useRef<number>(0);
  const currentPercentage = useRef<number>(0);
  const isAnimatingRef = useRef<boolean>(false);

  // Simple animation function that doesn't depend on React state
  const startAnimation = useCallback((targetCurrency: number, targetPercentage: number) => {
    // Don't start if already animating
    if (isAnimatingRef.current) {
      return;
    }

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    isAnimatingRef.current = true;
    setIsGlowing(true);

    const duration = 1500;
    const startTime = performance.now();
    const startCurrency = 0;
    const startPercentage = 0;
    let frameCount = 0; // Add frame counter

    const animateValue = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentCurrencyValue = Math.floor(startCurrency + (targetCurrency - startCurrency) * easedProgress);
      const currentPercentageValue = Math.round(startPercentage + (targetPercentage - startPercentage) * easedProgress);
      
      frameCount++; // Increment frame counter
      
      // Only update state every 3 frames to prevent too many re-renders
      if (frameCount % 3 === 0 || progress >= 1) {
        setAnimatedClamshells(currentCurrencyValue);
        setAnimatedPercentage(currentPercentageValue);
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateValue);
      } else {
        isAnimatingRef.current = false;
        setIsGlowing(false);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animateValue);
  }, []);

  // Watch for currency and percentage changes and trigger animation
  useEffect(() => {
    // Only update if either value actually changed
    if (currentCurrency.current !== currency || currentPercentage.current !== percentage) {
      // Only animate if we're going from 0 to positive values and not already animating
      if (lastCurrency.current === 0 && lastPercentage.current === 0 && 
          (currency > 0 || percentage > 0) && !isAnimatingRef.current) {
        startAnimation(currency, percentage);
      } else if (!isAnimatingRef.current) {
        setAnimatedClamshells(currency);
        setAnimatedPercentage(Math.round(percentage));
      }

      // Update tracking refs
      lastCurrency.current = currentCurrency.current;
      currentCurrency.current = currency;
      lastPercentage.current = currentPercentage.current;
      currentPercentage.current = percentage;
    }
  }, [currency, percentage, startAnimation]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        isAnimatingRef.current = false;
      }
    };
  }, []);

  // Load Hackatime projects once when component mounts or user changes
  useEffect(() => {
    // Skip Hackatime loading when in impersonation mode
    if (impersonationData) {
      setIsLoadingHackatime(false);
      return;
    }
    
    const userId = session?.user?.id;
    const hackatimeId = session?.user?.hackatimeId;

    // Skip if no user ID or we've already loaded for this user
    if (!userId || userId === loadedForUserId) {
      return;
    }

    // Check Hackatime setup from session... this really shouldn't happen, given our check earlier - but just in case
    if (!hackatimeId) {
      router.push('/bay/setup');
      return;
    }

    async function loadHackatimeProjects() {
      try {
        const projectsData = await getHackatimeProjects();
        
        // Ensure we have an array of projects
        const projects = Array.isArray(projectsData) ? projectsData : [];
        
        if (projects.length === 0) {
          setHackatimeProjects({});
          setProjectHours({});
          return;
        }
        
        // Create hours map (key: project name, value: hours)
        const hours = Object.fromEntries(
          projects.map((project: HackatimeProject) => [project.name, project.hours || 0])
        );
        
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
        
        setHackatimeProjects(projectNames);
        setProjectHours(hours);
        setLoadedForUserId(userId || null);
      } catch (error) {
        console.error('Failed to load Hackatime projects:', error);
        // Set empty objects to prevent undefined errors
        setHackatimeProjects({});
        setProjectHours({});
      } finally {
        setIsLoadingHackatime(false);
      }
    }

    loadHackatimeProjects();
  }, [session?.user?.id, loadedForUserId, router, session?.user?.hackatimeId]);

  // Trigger a re-render of projects list when projectHours changes
  // This ensures the sorting stays current when hours data updates
  useEffect(() => {
    if (Object.keys(projectHours).length > 0) {
      // Create a new array reference to force re-render with updated sort order
      setProjects([...projects]);
    }
  }, [projectHours]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
  };

  const [projectCreateState, projectCreateFormAction, projectCreatePending] = useActionState((state: FormSave, payload: FormData) => new Promise<FormSave>((resolve, reject) => {
    toast.promise(createProjectAction(state, payload), {
      loading: "Creating project...",
      error: () => { reject(); return "Failed to create new project" },
      success: data => {
        if (!data?.data) {
          reject(new Error('No project data received'));
          return "Failed to create new project";
        }
        resolve(data as FormSave);
        setIsProjectCreateModalOpen(false);
        // Refresh the entire projects list to ensure we get complete data including hackatimeLinks
        getUserProjects();
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
    if (impersonationData) {
      // Use provided impersonation data
      setProjects(impersonationData.projects);
      return;
    }
    
    const response = await fetch("/api/projects");
    const data = await response.json();
    setProjects(data);
  }

  useEffect(() => {
    getUserProjects();
  }, [impersonationData]);

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
    const total = projects.reduce((sum, project) => {
      // Get hours using our helper function
      let hours = getProjectHackatimeHours(project);
      
      // Cap hours per project at 15
      let cappedHours = Math.min(hours, 15);
      
      // If project is viral, it automatically counts as 15 hours
      if (project.viral) {
        return sum + cappedHours;
      }
      
      // If the project is not shipped, cap it at 14.75 hours
      if (!project.shipped && cappedHours > 14.75) {
        cappedHours = 14.75;
      }
      
      return sum + cappedHours;
    }, 0);
    
    // Calculate percentage (0-100)
    const percentage = Math.min(Math.round((total / 60) * 100), 100);
    
    setTotalHours(percentage);
  }, [projects, projectHours]);

  // Calculate total hours from shipped, viral, and other projects
  const calculateProgressSegments = (): ProgressSegment[] => {
    // Use centralized metrics
    const metrics = progressMetrics;
    
    if (!projects || !Array.isArray(projects)) {
      return [{ value: 100, color: '#e5e7eb', tooltip: 'No projects found', status: 'pending' }];
    }

    // Convert hours to percentages (based on 60-hour goal)
    const shippedPercentage = (metrics.shippedHours / 60) * 100;
    const viralPercentage = (metrics.viralHours / 60) * 100;
    const otherPercentage = (metrics.otherHours / 60) * 100;
    
    // Create segments array
    const segments: ProgressSegment[] = [];
    
    // Add shipped segment if there are hours
    if (metrics.shippedHours > 0) {
      segments.push({
        value: shippedPercentage,
        color: '#10b981', // Green
        label: 'Shipped',
        tooltip: `${metrics.shippedHours.toFixed(1)} hours from shipped projects`,
        animated: false,
        status: 'completed'
      });
    }
    
    // Add viral segment if there are hours
    if (metrics.viralHours > 0) {
      segments.push({
        value: viralPercentage,
        color: '#f59e0b', // Gold/Yellow
        label: 'Viral',
        tooltip: `${metrics.viralHours.toFixed(1)} hours from viral projects`,
        animated: false,
        status: 'completed'
      });
    }
    
    // Add other segment if there are hours
    if (metrics.otherHours > 0) {
      segments.push({
        value: otherPercentage,
        color: '#3b82f6', // Blue
        label: 'In Progress',
        tooltip: `${metrics.otherHours.toFixed(1)} hours from in-progress projects`,
        animated: true,
        status: 'in-progress'
      });
    }
    
    // Add remaining segment if total < 100%
    if (metrics.totalPercentage < 100) {
      segments.push({
        value: 100 - metrics.totalPercentage,
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

  return (
    <div className={styles.container}>
      {showIdentityPopup && <IDPopup />}
      {/* Impersonation Banner */}
      {impersonationData && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Admin Mode:</strong> You are viewing {impersonationData.user.name || impersonationData.user.email || 'Unknown User'}'s bay page
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin/users')}
              className="text-yellow-700 hover:text-yellow-900 text-sm underline"
            >
              Back to Admin
            </button>
          </div>
        </div>
      )}
      
      <div className={styles.progressSection}>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-4 mt-2.5 md:mt-1">
          {impersonationData ? `${impersonationData.user.name ? `${impersonationData.user.name}'s Voyage` : 'User Voyage'}` : 'Your Voyage'}
        </h2>
        <div className="border border-gray-300 rounded-lg p-3 sm:p-4 bg-white max-w-xl mx-auto">
          <div className="flex items-center justify-between w-full py-1 md:py-2">
            <div className="flex-grow px-2 sm:px-4 md:px-0">
              <div className="flex items-center justify-center gap-2 sm:gap-3 min-w-0">
                <Tooltip content={`You've built ${projects.length} project${projects.length !== 1 ? 's' : ''}, and grinded ${progressMetrics.rawHours} hour${progressMetrics.rawHours !== 1 ? 's' : ''} thus far`}>
                  <img src="/ship2.png" alt="Ship" className="h-12 sm:h-14 md:h-16 flex-shrink-0 flex items-center" />
                </Tooltip>
                <div 
                  className="flex-grow cursor-pointer min-w-0" 
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
                </div>
                <Tooltip content="Your prize - a fantastic island adventure with friends">
                  <img src="/island2.png" alt="Island" className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex-shrink-0 flex items-center" />
                </Tooltip>
              </div>
            </div>
          </div>
          
          {/* Progress + Clamshells Section */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-6 mt-4">
            {/* Progress representation */}
            <Tooltip content={`Believe it or not, you are ${Math.round(progressMetrics.totalPercentage)}% of the way to the Island!!!`}>
              <div className="flex flex-col items-center justify-center w-24 sm:w-28 md:w-32 bg-gray-100 rounded-lg p-2 sm:p-3 md:p-4 h-[90px] sm:h-[100px] md:h-[108px]">
                <div className={`text-xl sm:text-2xl md:text-3xl font-bold text-gray-700 ${isGlowing ? 'percentage-animated' : ''}`}>{animatedPercentage}%</div>
                <div className={`text-[10px] sm:text-xs text-gray-500 text-center ${isGlowing ? 'percentage-animated' : ''}`}>Island Progress</div>
              </div>
            </Tooltip>
            
            {/* Plus sign */}
            <div className={`text-2xl sm:text-3xl md:text-4xl font-bold text-gray-400 ${isGlowing ? 'percentage-animated' : ''}`}>+</div>
            
            {/* Clamshells */}
            <Tooltip content="Approved & shipped hours that exceed 15h per project are converted into Clamshells.  These funds can be applied to travel costs, and also potentially converted to grantable prizes!">
              <div className="relative flex items-center justify-center bg-gray-100 rounded-lg p-2 sm:p-3 md:p-4 w-24 sm:w-28 md:w-32 h-[90px] sm:h-[100px] md:h-[108px]" style={{overflow: 'hidden'}}>
                <div className="relative w-full h-full flex items-center justify-center">
                                      <img 
                      src="/shell_720.png"
                      alt="Clamshell"
                      className={`w-full h-full object-contain ${isGlowing ? 'clamshell-animated' : ''}`}
                      style={{transform: 'scale(1.6) translateX(-2px) translateY(-2px)'}}
                    />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="font-bold text-sm sm:text-base text-center text-black" style={{marginTop: '-2px'}}>{animatedClamshells}</span>
                  </div>
                </div>
              </div>
            </Tooltip>
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
            Your current progress: <span className="font-bold">{Math.round(progressMetrics.totalPercentage)}%</span> toward the 60-hour requirement
          </p>
        </div>
      </Modal>
      
      <div className={styles.content}>
        <div className={styles.projectList}>
          <div className="mt-2 md:mt-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{impersonationData ? `${impersonationData.user.name || 'User'}'s Projects` : 'Your Projects'}</h2>
              {!impersonationData && (
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
              )}
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
              {projects
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
                    hoursOverride={project.hoursOverride ?? undefined}
                    viral={!!project.viral}
                    shipped={!!project.shipped}
                    in_review={!!project.in_review}
                    editHandler={(project) => {
                      // Check if the edit request is coming from the edit button
                      const isEditRequest = 'isEditing' in project;
                      
                      // In impersonation mode, only allow selection (not editing)
                      if (impersonationData && isEditRequest) {
                        return; // Prevent actual editing in impersonation mode
                      }
                      
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
                ))}
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
                    <FormInput
                      fieldName='shipped'
                      state={projectEditState}
                      placeholder='shipped'
                      defaultValue={initialEditState.shipped?.toString() || 'false'}
                    >
                      {""}
                    </FormInput>
                    <FormInput
                      fieldName='viral'
                      state={projectEditState}
                      placeholder='viral'
                      defaultValue={initialEditState.viral?.toString() || 'false'}
                    >
                      {""}
                    </FormInput>
                    <FormInput
                      fieldName='in_review'
                      state={projectEditState}
                      placeholder='in_review'
                      defaultValue={initialEditState.in_review?.toString() || 'false'}
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
                
                // Create an object with all the necessary properties
                const projectWithProps = {
                  ...selectedProject,
                  hours: getProjectHackatimeHours(selectedProject),
                  viral: !!selectedProject.viral,
                  shipped: !!selectedProject.shipped,
                };
                
                // Otherwise show the project details
                return (
                  <ProjectDetail 
                    project={projectWithProps}
					projects={projects}
                    onEdit={impersonationData ? () => {
                      toast.error("Cannot edit projects while impersonating users");
                    } : (project) => {
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
                      }, 0);
                    }}
                    setProjects={setProjects}
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
            
            // Calculate project's contribution percentage
            const getSelectedProjectHours = () => {
              if (!projects || !Array.isArray(projects)) return 0;
              
              const selectedProject = projects.find(p => p?.projectID === selectedProjectId);
              
              if (!selectedProject) {
                return 0;
              }

  const allProjectsWithHours = projects
    .map(project => ({
      project,
      hours: getProjectHackatimeHours(project)
    }))
    .sort((a, b) => b.hours - a.hours);

  // Get top 4 projects for island percentage calculation
  const top4Projects = allProjectsWithHours.slice(0, 4);

  if (!top4Projects.find(x=>x.project.projectID === selectedProject.projectID))
	  return 0;

              // Use hoursOverride if available, otherwise use raw hours
              const hours = typeof selectedProject?.hoursOverride === 'number' && selectedProject.hoursOverride !== null
                ? selectedProject.hoursOverride
                : getProjectHackatimeHours(selectedProject);
              
              // Cap hours per project at 15
              let cappedHours = Math.min(hours, 15);
              
              if (selectedProject?.viral === true) {
                return cappedHours;
              }
              
              // If not shipped, cap at 14.75 hours
              if (selectedProject?.shipped !== true && cappedHours > 14.75) {
                cappedHours = 14.75;
              }
              
              return cappedHours;
            };
            
            const selectedProjectContribution = getSelectedProjectHours();
            const contributionPercentage = Math.round((selectedProjectContribution / 60) * 100);
            
            return (
              <div className="p-4">
                {/* Review Mode Banner */}
                {isReviewMode && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4 rounded-r">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Icon glyph="view" size={20} className="text-blue-500" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          <strong>Review Mode Active:</strong> You can now add and delete reviews on this project.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-5 pb-8">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                    <p className="text-base text-gray-900">{selectedProject.description || "No description provided."}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-center text-sm">
                      <p>This project contributes <strong>{selectedProjectContribution}</strong> hour{selectedProjectContribution !== 1 && 's'} (<strong>{contributionPercentage}%</strong>) toward your island journey</p>
                      <ProjectStatus 
                        viral={selectedProject.viral} 
                        shipped={selectedProject.shipped}
                        in_review={selectedProject.in_review}
                      />
                    </div>
                  </div>
                  
                  {/* Project Hours Details Section */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Project Hours</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-500">Raw Hackatime Hours</span>
                        <p className="text-lg font-semibold mt-1">
                          {selectedProject.hackatimeLinks && selectedProject.hackatimeLinks.length > 0 
                            ? `${selectedProject.hackatimeLinks.reduce((sum, link) => sum + (link.rawHours || 0), 0)}h`
                            : `${selectedProject.rawHours || 0}h`}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Approved Hackatime Hours</span>
                        <p className="text-lg font-semibold mt-1">
                          {(() => {
                            if (selectedProject.hackatimeLinks && selectedProject.hackatimeLinks.length > 0) {
                              const totalApproved = selectedProject.hackatimeLinks.reduce((sum, link) => {
                                return sum + (link.hoursOverride !== null && link.hoursOverride !== undefined ? link.hoursOverride : 0);
                              }, 0);
                              return totalApproved > 0 ? `${totalApproved}h` : '—';
                            } else {
                              return selectedProject.hoursOverride !== undefined && selectedProject.hoursOverride !== null 
                                ? `${selectedProject.hoursOverride}h` 
                                : '—';
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Project Review Request for Mobile - only visible when NOT in review mode and not already in review */}
                  <ProjectReviewRequest
                    projectID={selectedProject.projectID}
                    isInReview={selectedProject.in_review}
                    isShipped={selectedProject.shipped}
                    isViral={selectedProject.viral}
                    codeUrl={selectedProject.codeUrl}
                    playableUrl={selectedProject.playableUrl}
                    screenshot={selectedProject.screenshot}
                    onRequestSubmitted={impersonationData ? () => {
                      toast.error("Cannot submit projects for review while impersonating users");
                    } : (updatedProject, review) => {
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
                    onEditProject={impersonationData ? () => {
                      toast.error("Cannot edit projects while impersonating users");
                    } : () => {
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
                  />
                  
                                    {/* Project Flags Editor for Mobile - only visible in review mode */}
                  <ProjectFlagsEditor
                    projectID={selectedProject.projectID}
                    initialShipped={!!selectedProject.shipped}
                    initialViral={!!selectedProject.viral}
                    initialInReview={!!selectedProject.in_review}
                    onChange={impersonationData ? () => {
                      toast.error("Cannot modify project flags while impersonating users");
                    } : (flags: ProjectFlags) => {
                      // Create a new object with the updated flags
                      const updatedSelectedProject = {
                        ...selectedProject,
                      };
                      
                      // Update the project in the projects array
                      setProjects(prevProjects => 
                        prevProjects.map(p => 
                          p.projectID === selectedProject.projectID ? updatedSelectedProject : p
                        )
                      );
                    }}
                  />
                  
                  {/* Hackatime Project Links Section for Mobile */}
                  {selectedProject.hackatimeLinks && selectedProject.hackatimeLinks.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        Hackatime Project Links
                      </h3>
                      <div className="bg-white rounded border">
                        {/* Table Header */}
                        <div className="grid grid-cols-3 gap-4 p-3 border-b bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div>PROJECT</div>
                          <div className="text-center">RAW</div>
                          <div className="text-center">APPROVED</div>
                        </div>
                        {/* Table Rows */}
                        {selectedProject.hackatimeLinks.map((link, index) => (
                          <div key={link.id} className="grid grid-cols-3 gap-4 p-3 border-b last:border-b-0 text-sm">
                            <div className="font-medium text-gray-900">{link.hackatimeName}</div>
                            <div className="text-center text-gray-600">{link.rawHours}h</div>
                            <div className="text-center">
                              {link.hoursOverride !== null && link.hoursOverride !== undefined ? (
                                <span className="text-blue-600 font-medium">{link.hoursOverride}h</span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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
                    projectOwnerUserId={selectedProject.userId}
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
                  />
                  
                  {/* Edit button at bottom */}
                  <div className="sticky bottom-0 left-0 right-0 p-4 mt-4 bg-white border-t border-gray-200 z-20">
                    {isReviewMode || !selectedProject.in_review ? (
                      <button
                        type="button"
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors focus:outline-none flex items-center justify-center gap-2"
                        onClick={impersonationData ? () => {
                          toast.error("Cannot edit projects while impersonating users");
                        } : () => {
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
              
              {/* <button
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
              </button> */}
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
  isAdmin?: boolean
}

function ProjectModal(props: ProjectModalProps): ReactElement {
  const isCreate = props.modalTitle?.toLowerCase().includes('create');
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState<boolean>(false);
  const [selectedHackatimeProjects, setSelectedHackatimeProjects] = useState<string[]>([]);
  
  // Reset selected projects when modal opens for creation
  useEffect(() => {
    if (props.isOpen && isCreate) {
      setSelectedHackatimeProjects([]);
    }
  }, [props.isOpen, isCreate]);
  
  // Filter out already added projects for create mode
  const availableHackatimeProjects = useMemo(() => {
    if (!isCreate) {
      // When editing, just use the existing projects
      return props.hackatimeProjects;
    }
    
    // For creation - filter out projects that are already added
    // This uses the existing projects prop passed to every ProjectModal instance
    const allProjects = props.existingProjects || [];
    
    // Create a new filtered map for creating new projects
    const filtered: Record<string, string> = {};
    
    // Get already used hackatime project names
    const usedHackatimeProjects: string[] = [];
    
    // Collect all hackatime project names that are already used
    allProjects.forEach((project: ProjectType) => {
      if (project.hackatimeLinks && project.hackatimeLinks.length > 0) {
        project.hackatimeLinks.forEach(link => {
          usedHackatimeProjects.push(link.hackatimeName);
        });
      }
    });
    
    // Add only unused projects to the filtered map
    Object.entries(props.hackatimeProjects).forEach(([label, projectName]) => {
      if (!usedHackatimeProjects.includes(projectName) && projectName !== '<<LAST_PROJECT>>') {
        filtered[label] = projectName;
      }
    });
    
    return filtered;
  }, [isCreate, props.hackatimeProjects, props.existingProjects]);
  
  const handleDeleteConfirm = () => {
    // Close the confirmation modal
    setIsDeleteConfirmModalOpen(false);
    
    // Close the project modal
    props.setIsOpen(false);
    
         // Show message that deletion is restricted
     toast.error("Sorry, you cannot unlink your hackatime project from Shipwrecked.");
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
        <form action={props.formAction} className="relative">
          <span className="invisible h-0 w-0 overflow-hidden [&_*]:invisible [&_*]:h-0 [&_*]:w-0 [&_*]:overflow-hidden">
            <FormInput
              fieldName='projectID'
              state={props.state}
              placeholder='projectID'
              {...(props.projectID && { defaultValue: props.projectID})}
            >
              {""}
            </FormInput>
            <FormInput
              fieldName='shipped'
              state={props.state}
              placeholder='shipped'
              defaultValue={props.shipped?.toString() || 'false'}
            >
              {""}
            </FormInput>
            <FormInput
              fieldName='viral'
              state={props.state}
              placeholder='viral'
              defaultValue={props.viral?.toString() || 'false'}
            >
              {""}
            </FormInput>
            <FormInput
              fieldName='in_review'
              state={props.state}
              placeholder='in_review'
              defaultValue={props.in_review?.toString() || 'false'}
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

              {/* Chat Settings Section */}
              <div className="mb-5 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Discussion</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">Enable chat discussion</p>
                    <p className="text-xs text-gray-500">Allow others to discuss this project</p>
                  </div>
                  <input 
                    type="checkbox" 
                    name="chat_enabled"
                    defaultChecked={!!props.chat_enabled}
                    className="ml-3 toggle-checkbox w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}
          
          {isCreate ? (
            <div className="mb-5 bg-gray-50 p-4 rounded-lg">
              <HackatimeMultiSelect
                availableProjects={availableHackatimeProjects}
                selectedProjects={selectedHackatimeProjects}
                onSelectionChange={setSelectedHackatimeProjects}
                isLoading={props.isLoadingHackatime}
                disabled={props.isLoadingHackatime || Object.keys(props.hackatimeProjects).length === 0}
              />
            </div>
          ) : null}
          
          {/* Fixed button at bottom of modal */}
          <div 
            className="sticky bottom-0 left-0 right-0 p-4 mt-4 bg-white border-t border-gray-200 z-20"
            style={{ bottom: "-6%"}}
          >
            <button
              type="submit"
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors focus:outline-none flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={
                props.pending || 
                props.isLoadingHackatime || 
                (isCreate && selectedHackatimeProjects.length === 0)
              }
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

// Custom Multi-Select Component for Hackatime Projects
function HackatimeMultiSelect({
  availableProjects,
  selectedProjects,
  onSelectionChange,
  isLoading,
  disabled
}: {
  availableProjects: Record<string, string>;
  selectedProjects: string[];
  onSelectionChange: (selected: string[]) => void;
  isLoading: boolean;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState<'down' | 'up'>('down');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Determine dropdown direction based on available space
  const handleToggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If there's less than 200px below but more than 200px above, open upward
      if (spaceBelow < 200 && spaceAbove > 200) {
        setDropdownDirection('up');
      } else {
        setDropdownDirection('down');
      }
    }
    setIsOpen(!isOpen);
  };

  const handleToggleProject = (projectName: string) => {
    if (selectedProjects.includes(projectName)) {
      onSelectionChange(selectedProjects.filter(p => p !== projectName));
    } else {
      onSelectionChange([...selectedProjects, projectName]);
    }
  };

  const handleRemoveProject = (projectName: string) => {
    onSelectionChange(selectedProjects.filter(p => p !== projectName));
  };

  const availableEntries = Object.entries(availableProjects);
  const unselectedProjects = availableEntries.filter(([_, projectName]) => 
    !selectedProjects.includes(projectName)
  );

  return (
    <div className="w-full mb-8">
      <label className="text-lg font-semibold text-left">
        Your Hackatime Projects
        <p className="text-red-500 inline">*</p>
      </label>
      
      {/* Selected Projects Display */}
      {selectedProjects.length > 0 && (
        <div className="mt-2 mb-3">
          <div className="flex flex-wrap gap-2">
            {selectedProjects.map(projectName => {
              const displayLabel = availableEntries.find(([_, name]) => name === projectName)?.[0] || projectName;
              return (
                <div
                  key={projectName}
                  className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                >
                  <span>{displayLabel}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveProject(projectName)}
                    className="text-blue-600 hover:text-blue-800 font-bold"
                    disabled={disabled}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dropdown for adding more projects */}
      {unselectedProjects.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            ref={buttonRef}
            type="button"
            onClick={handleToggleDropdown}
            disabled={disabled || isLoading}
            className="w-full px-4 py-2 bg-gray-100 rounded outline-1 outline-gray-200 text-left flex justify-between items-center disabled:bg-gray-200"
          >
            <span className="text-gray-600">
              {isLoading 
                ? 'Loading projects...' 
                : selectedProjects.length === 0 
                  ? 'Select Hackatime Projects'
                  : 'Add more projects...'
              }
            </span>
            <span className="text-gray-400">▼</span>
          </button>

          {isOpen && !disabled && !isLoading && (
            <div className={`absolute z-50 w-full bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto ${
              dropdownDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}>
              {unselectedProjects.map(([displayLabel, projectName]) => (
                <button
                  key={projectName}
                  type="button"
                  onClick={() => {
                    handleToggleProject(projectName);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  {displayLabel}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hidden inputs for form submission */}
      {selectedProjects.map(projectName => (
        <input
          key={projectName}
          type="hidden"
          name="hackatimeProjects"
          value={projectName}
        />
      ))}

      {/* Validation message */}
      {selectedProjects.length === 0 && (
        <p className="text-sm text-gray-500 mt-1">
          Please select at least one Hackatime project
        </p>
      )}
    </div>
  );
}
