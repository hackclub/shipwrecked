'use client';
import styles from './page.module.css';
import Modal from '@/components/common/Modal';
import Toast from '@/components/common/Toast';
import { useState, useEffect, useActionState, useContext, useMemo } from 'react';
import type { FormSave } from '@/components/form/FormInput';
import { Project } from '@/components/common/Project';
import FormSelect from '@/components/form/FormSelect';
import FormInput from '@/components/form/FormInput';
import { useSession } from 'next-auth/react';
import { Toaster, toast } from "sonner";
import ProgressBar from '@/components/common/ProgressBar';
import type { ProjectType } from '../api/projects/route';
import { useRouter } from 'next/navigation';
import type { HackatimeProject } from "@/types/hackatime";
import Icon from "@hackclub/icons";

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

// Project Detail Component
function ProjectDetail({ project, onEdit }: { project: ProjectType, onEdit: () => void }) {
  const handleEdit = () => {
    // Explicitly call onEdit with the full project data to ensure proper form initialization
    onEdit();
  };
  
  return (
    <div className={`${styles.editForm}`}>
      <div className="flex justify-between items-center mb-5 border-b pb-3 sticky top-0 bg-white z-10">
        <h2 className="text-2xl font-bold">{project.name}</h2>
        <button
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          onClick={handleEdit}
          aria-label="Edit project"
        >
          <span>Edit</span>
        </button>
      </div>
      
      <div className="space-y-5 pb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
          <p className="text-base text-gray-900">{project.description || "No description provided."}</p>
        </div>
        
        {project.hackatime && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Hackatime Project</h3>
            <p className="text-base text-gray-900">{project.hackatime}</p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3 col-span-2">Project Status</h3>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${project.viral ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm text-gray-700">Viral</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${project.shipped ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm text-gray-700">Shipped</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${project.in_review ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm text-gray-700">In Review</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${project.approved ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm text-gray-700">Approved</span>
          </div>
        </div>
        
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
            <img 
              src={project.screenshot} 
              alt={`Screenshot of ${project.name}`}
              className="mt-2 rounded-lg max-w-full h-auto border border-gray-200"
            />
          </div>
        )}
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

  // Track if we've loaded projects for this user
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [totalHours, setTotalHours] = useState<number>(0);
  const [isProjectCreateModalOpen, setIsProjectCreateModalOpen] = useState<boolean>(false);
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState<boolean>(false);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [hackatimeProjects, setHackatimeProjects] = useState<Record<string, string>>({});
  const [projectHours, setProjectHours] = useState<Record<string, number>>({});
  const [isLoadingHackatime, setIsLoadingHackatime] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectType | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState<boolean>(false);

  // Load Hackatime projects once when component mounts or user changes
  useEffect(() => {
    const userId = session?.user?.id;
    const hackatimeId = session?.user?.hackatimeId;
    // console.log('⚡ Effect triggered.', { userId, loadedForUserId, hackatimeId });

    // Skip if no user ID or we've already loaded for this user
    if (!userId || userId === loadedForUserId) {
      console.log('⏭️ Skipping load:', !userId ? 'no user ID' : 'already loaded for this user');
      return;
    }

    // Check Hackatime setup from session... this really shouldn't happen, given our check earlier - but just in case
    if (!hackatimeId) {
      console.log('⚠️ No Hackatime ID in session, redirecting to setup...');
      router.push('/bay/setup');
      return;
    }

    async function loadHackatimeProjects() {
      try {
        console.log('🚀 Loading Hackatime projects for user:', userId);
        const projectsData = await getHackatimeProjects();
        
        // Ensure we have an array of projects
        const projects = Array.isArray(projectsData) ? projectsData : [];
        console.log(`📦 Received ${projects.length} projects`);
        
        if (projects.length === 0) {
          console.log('No projects found or invalid data received');
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
          // Use original project name as both key and value
          // The FormSelect component displays the keys
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
  }, [session?.user?.id, loadedForUserId, router]); // Only depend on user ID and router

  // Trigger a re-render of projects list when projectHours changes
  // This ensures the sorting stays current when hours data updates
  useEffect(() => {
    if (Object.keys(projectHours).length > 0) {
      console.log('Project hours updated, triggering re-render for sorting');
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
        // Update projects list with new project
        setProjects(prev => [...prev, data.data as ProjectType]);
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

  const [initialEditState, setInitialEditState] = useState<any>({
    name: "",
    description: "",
    hackatime: "",
    codeUrl: "",
    playableUrl: "",
    screenshot: "",
    userId: "",
    projectID: ""
  });

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

  useEffect(() => {
    getUserProjects();
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
      } else if (e.key === 'e' && selectedProjectId && !isProjectEditModalOpen) {
        // Only open edit if the project still exists
        const projectExists = projects.some(p => p.projectID === selectedProjectId);
        if (projectExists) {
          // Press 'e' to edit selected project
          setIsProjectEditModalOpen(true);
        } else {
          // Clear selection if project doesn't exist
          setSelectedProjectId(null);
          toast.error("Project not found. It may have been deleted.");
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProjectId, isProjectEditModalOpen, isProjectCreateModalOpen, projects, isMobile]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    // Call the handler right away to set the initial value
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        in_review: initialEditState.in_review || false,
        approved: initialEditState.approved || false
      };
      
      console.log("Project edit state synchronized:", {
        selectedProjectId,
        initialEditState,
        projectEditState
      });
    }
  }, [selectedProjectId, initialEditState, projectEditState]);

  // Update total hours whenever projects or projectHours changes
  useEffect(() => {
    // Only count hours from projects that are in the projects list
    const total = projects.reduce((sum, project) => {
      // If project has a hackatime ID, get hours from projectHours, otherwise default to 0
      let hours = project.hackatime ? (projectHours[project.hackatime] || 0) : 0;
      
      // Cap hours per project at 15
      hours = Math.min(hours, 15);
      
      // If the project is not shipped, cap it at 14.75 hours
      if (!project.shipped && hours > 14.75) {
        hours = 14.75;
      }
      
      return sum + hours;
    }, 0);
    
    // Calculate percentage (0-100)
    const percentage = Math.min(Math.round((total / 60) * 100), 100);
    
    console.log('Calculated progress:', percentage, '% based on', total, 'hours from projects:', projects);
    setTotalHours(percentage);
  }, [projects, projectHours]);

  return (
    <div className={styles.container}>
      <div className={styles.progressSection}>
        <div className="w-full max-w-xl mx-auto py-2 md:py-4 md:mb-6">
          <div className="px-4 sm:px-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-4xl md:text-5xl">👤</span>
              <div className="flex-grow cursor-pointer" onClick={() => setIsProgressModalOpen(true)}>
                <ProgressBar 
                  value={totalHours} 
                  max={100} 
                  height={8}
                  variant={totalHours >= 100 ? 'success' : 'default'}
                  animated={totalHours < 100}
                />
              </div>
              <span className="text-4xl md:text-5xl">🏝️</span>
            </div>
            <div className="text-center mt-1 mb-1">
              <h3 className="font-medium text-lg">
                {totalHours}%
              </h3>
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
          <h3 className="text-lg font-semibold mb-3">Your Journey to Shipwreck Island</h3>
          <p className="mb-4">
            The progress bar shows your completion percentage towards the 60-hour goal required to qualify for Shipwrecked.
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-2">How We Calculate Your Progress:</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                We track the total development hours from all your Hackatime projects listed in The Bay
              </li>
              <li>
                <strong>Each project is capped at 15 hours maximum</strong> contribution toward your total
              </li>
              <li>
                Projects that are not marked as "shipped" are capped at 14.75 hours
              </li>
              <li>
                Your percentage is calculated as: <span className="font-mono bg-gray-100 px-2 py-1 rounded">Total Hours ÷ 60 × 100</span>
              </li>
              <li>
                When you reach 60 hours of tracked development time (with the caps applied), you'll be at 100%
              </li>
              <li>
                Only hours from projects you've added to The Bay count toward your progress
              </li>
            </ul>
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
            Your current progress: <span className="font-bold">{totalHours}%</span> toward the 60-hour requirement
          </p>
        </div>
      </Modal>
      <div className={styles.content}>
        <div className={styles.projectList}>
          <div className="mt-2 md:mt-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Your Projects</h2>
              <button 
                className="p-2 bg-gray-900 rounded-full text-white hover:bg-gray-700 transition-colors"
                onClick={() => setIsProjectCreateModalOpen(true)}
              >
                <Icon glyph="plus" size={24} />
              </button>
            </div>
            <div className="text-sm text-gray-500 mb-2">
              <p className="hidden md:block">
                Click a project to select it. Use <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">E</kbd> to edit, <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> to close.
              </p>
              <p className="md:hidden">
                Tap a project to edit it directly.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow">
              {projects
                .sort((a, b) => {
                  // Get hours for each project, default to 0 if not found
                  const hoursA = a.hackatime ? (projectHours[a.hackatime] || 0) : 0;
                  const hoursB = b.hackatime ? (projectHours[b.hackatime] || 0) : 0;
                  // Sort by hours in descending order (highest first)
                  return hoursB - hoursA;
                })
                .map((project, index) => (
                <Project
                  key={project.projectID}
                  {...project}
                  hours={project.hackatime ? projectHours[project.hackatime] || 0 : 0}
                  editHandler={(project) => {
                    // Check if the edit request is coming from the edit button
                    const isEditRequest = 'isEditing' in project;
                    
                    // For mobile devices, always show the edit form when tapping a project
                    if (isMobile) {
                      setSelectedProjectId(project.projectID);
                      setInitialEditState(project);
                      setIsProjectEditModalOpen(true);
                      return;
                    }
                    
                    // For desktop: if clicking the same project and not an edit request, toggle selection
                    if (selectedProjectId === project.projectID && !isEditRequest) {
                      setSelectedProjectId(null);
                    } else {
                      // Otherwise, select the new project and update form state
                      setSelectedProjectId(project.projectID);
                      setInitialEditState(project);
                      
                      // Only show edit modal if explicitly requested
                      if (isEditRequest) {
                        setIsProjectEditModalOpen(true);
                      }
                    }
                  }}
                  // Only show selected state on desktop
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
        {selectedProjectId && (
          <>
            {isProjectEditModalOpen ? (
              // Edit Form
              <div className={`${styles.editForm} relative`}>
                <div className="flex justify-between items-center mb-5 border-b pb-3 sticky top-0 bg-white z-10">
                  <h2 className="text-2xl font-bold">Edit Project</h2>
                  <button
                    className="flex items-center gap-1 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                    onClick={() => {
                      setIsProjectEditModalOpen(false);
                    }}
                    aria-label="Close project edit form"
                  >
                    <span className="text-xl leading-none">&times;</span>
                  </button>
                </div>
                <form action={projectEditFormAction} className="pb-20">
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
                  
                  <div className="grid grid-cols-2 gap-4 mb-5 bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 col-span-2">Project Status</h3>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!initialEditState.viral} readOnly disabled /> Viral
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!initialEditState.shipped} readOnly disabled /> Shipped
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!initialEditState.in_review} readOnly disabled /> In Review
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!initialEditState.approved} readOnly disabled /> Approved
                    </label>
                  </div>
                  
                  {/* Delete Project Section */}
                  <div className="mb-5 bg-gray-50 p-4 rounded-lg border-l-4 border-red-500">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Danger Zone</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Once you delete a project, there is no going back. Please be certain.
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors focus:outline-none flex items-center gap-2"
                      onClick={() => {
                        // Find the project in the projects array
                        const projectToDelete = projects.find(p => p.projectID === selectedProjectId);
                        
                        if (projectToDelete) {
                          // Set the project to delete and open the confirmation modal
                          setProjectToDelete(projectToDelete);
                          setIsDeleteConfirmModalOpen(true);
                        }
                      }}
                    >
                      <Icon glyph="delete" size={16} />
                      <span>Delete Project</span>
                    </button>
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
                  <div className="sticky bottom-0 left-0 right-0 p-4 mt-4 bg-white border-t border-gray-200 z-20">
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
              // Check if the selected project still exists
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
                
                // Otherwise show the project details
                return (
                  <ProjectDetail 
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
                        approved: !!selectedProject.approved
                      };
                      
                      console.log("Opening edit form with data:", projectWithDefaults);
                      
                      // Update the form state
                      setInitialEditState(projectWithDefaults);
                      
                      // Wait for state to be updated before showing the form
                      setTimeout(() => {
                        setIsProjectEditModalOpen(true);
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
        />
        {/* Edit Project Modal - Mobile Only */}
        <div className="md:hidden">
          {selectedProjectId && projects.find(p => p.projectID === selectedProjectId) && (
            <ProjectModal
              isOpen={isProjectEditModalOpen}
              setIsOpen={setIsProjectEditModalOpen}
              formAction={projectEditFormAction}
              state={projectEditState}
              pending={projectEditPending}
              modalTitle='Edit Project!'
              hackatimeProjects={hackatimeProjects}
              isLoadingHackatime={isLoadingHackatime}
              hideFooter={true}
              existingProjects={projects}
              {...initialEditState}
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
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded focus:outline-none transition-colors"
                onClick={() => {
                  // Don't proceed if no project is selected
                  if (!projectToDelete) return;
                  
                  // Close the confirmation modal
                  setIsDeleteConfirmModalOpen(false);
                  
                  // Close the edit modal if it's open
                  setIsProjectEditModalOpen(false);
                  
                  // Delete the project
                  const deleteProject = async () => {
                    try {
                      const response = await fetch(`/api/projects/${projectToDelete.projectID}`, {
                        method: 'DELETE'
                      });
                      
                      if (!response.ok) throw new Error('Failed to delete project');
                      
                      // Remove from projects list
                      setProjects(prev => prev.filter(p => p.projectID !== projectToDelete.projectID));
                      
                      // Clear selection
                      setSelectedProjectId(null);
                      
                      toast.success(`Project "${projectToDelete.name}" deleted successfully`);
                    } catch (error) {
                      toast.error(`Failed to delete project: ${error}`);
                      console.error('Error deleting project:', error);
                    }
                  };
                  
                  deleteProject();
                }}
              >
                Delete Project
              </button>
            </div>
          </div>
        </Modal>
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
  existingProjects?: ProjectType[]
}

function ProjectModal(props: ProjectModalProps) {
  const isCreate = props.modalTitle?.toLowerCase().includes('create');
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState<boolean>(false);
  
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
      if (project.hackatime) {
        usedHackatimeProjects.push(project.hackatime);
      }
    });
    
    // Add only unused projects to the filtered map
    Object.entries(props.hackatimeProjects).forEach(([label, projectName]) => {
      if (!usedHackatimeProjects.includes(projectName)) {
        filtered[label] = projectName;
      }
    });
    
    // console.log('Filtering projects. Available:', Object.keys(filtered).length, 'Used:', usedHackatimeProjects.length);
    
    return filtered;
  }, [isCreate, props.hackatimeProjects, props.existingProjects]);
  
  const handleDeleteConfirm = () => {
    // Close the confirmation modal
    setIsDeleteConfirmModalOpen(false);
    
    // Close the project modal
    props.setIsOpen(false);
    
    // Delete the project
    const deleteProject = async () => {
      try {
        const response = await fetch(`/api/projects/${props.projectID}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete project');
        
        // Notify success
        toast.success(`Project "${props.name}" deleted successfully`);
        
        // Refresh the projects list
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        toast.error(`Failed to delete project: ${error}`);
        console.error('Error deleting project:', error);
      }
    };
    
    deleteProject();
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
        <form action={props.formAction} className="pb-16 relative">
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
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!props.approved} readOnly disabled /> Approved
                </label>
              </div>
              
              {/* Delete Project Section - Only for edit, not create */}
              <div className="mb-5 bg-gray-50 p-4 rounded-lg border-l-4 border-red-500">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Danger Zone</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Once you delete a project, there is no going back. Please be certain.
                </p>
                <button
                  type="button"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors focus:outline-none flex items-center gap-2"
                  onClick={() => setIsDeleteConfirmModalOpen(true)}
                >
                  <Icon glyph="delete" size={16} />
                  <span>Delete Project</span>
                </button>
              </div>
            </>
          )}
          
          <div className="mb-5 bg-gray-50 p-4 rounded-lg">
            <FormSelect 
              fieldName='hackatime'
              placeholder={
                props.isLoadingHackatime 
                  ? 'Loading projects...' 
                  : Object.keys(props.hackatimeProjects).length === 0
                    ? 'No Hackatime projects found'
                    : 'Select a Hackatime Project'
              }
              required
              values={availableHackatimeProjects}
              {...(props.hackatime && { 
                defaultValue: props.hackatime
              })}
              disabled={!isCreate || props.isLoadingHackatime || Object.keys(props.hackatimeProjects).length === 0}
            >
              Your Hackatime Project
            </FormSelect>
          </div>
          
          {/* Fixed button at bottom of modal */}
          <div className="sticky bottom-0 left-0 right-0 p-4 mt-4 bg-white border-t border-gray-200 z-10">
            <button
              type="submit"
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors focus:outline-none flex items-center justify-center gap-2"
              disabled={props.pending || props.isLoadingHackatime}
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
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded focus:outline-none transition-colors"
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
