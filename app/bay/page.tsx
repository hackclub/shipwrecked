'use client';
import styles from './page.module.css';
import Modal from '@/components/common/Modal';
import Toast from '@/components/common/Toast';
import { useState, useEffect, useActionState } from 'react';
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
  const response = await fetch('/api/hackatime/projects');
  return await response.json() as HackatimeProject[];
}

// Project Detail Component
function ProjectDetail({ project, onEdit }: { project: ProjectType, onEdit: () => void }) {
  return (
    <div className={styles.editForm}>
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold">{project.name}</h2>
        <button
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          onClick={onEdit}
          aria-label="Edit project"
        >
          <Icon glyph="edit" size={16} />
          <span>Edit</span>
        </button>
      </div>
      
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
        <p className="text-base text-gray-900">{project.description || "No description provided."}</p>
      </div>
      
      {project.hackatime && (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Hackatime Project</h3>
          <p className="text-base text-gray-900">{project.hackatime}</p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2 col-span-2">Project Status</h3>
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
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Links</h3>
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
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Screenshot</h3>
          <img 
            src={project.screenshot} 
            alt={`Screenshot of ${project.name}`}
            className="mt-2 rounded-lg max-w-full h-auto border border-gray-200"
          />
        </div>
      )}
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

  // // Check Hackatime setup in an effect instead of during render
  // useEffect(() => {
  //   console.log('🔍 Checking Hackatime setup:', { 
  //     status, 
  //     hasSession: !!session,
  //     hasUser: !!session?.user,
  //     hackatimeId: session?.user?.hackatimeId 
  //   });

  //   if (status === "authenticated" && !session?.user?.hackatimeId) {
  //     console.log('⚠️ No Hackatime ID found, redirecting to setup');
  //     router.replace('/bay/setup');
  //   } else {
  //     console.log('✅ Hackatime check complete:', {
  //       authenticated: status === "authenticated",
  //       hasHackatimeId: !!session?.user?.hackatimeId
  //     });
  //   }
  // }, [session?.user?.hackatimeId, status, router]);

  // // Show loading while the effect potentially redirects
  // if (!session?.user?.hackatimeId) {
  //   return <Loading />;
  // }

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

  // // Add render tracking
  // console.log('🔄 Bay component rendering', { 
  //   status, 
  //   userId: session?.user?.id,
  //   loadedForUserId 
  // });

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
        const projects = await getHackatimeProjects();
        console.log(`📦 Received ${projects.length} projects`);
        
        // Create separate maps for project names and hours
        const projectNames = Object.fromEntries(
          projects.map((project: HackatimeProject) => [project.name, project.name])
        );
        const hours = Object.fromEntries(
          projects.map((project: HackatimeProject) => [project.name, project.hours || 0])
        );
        
        setHackatimeProjects(projectNames);
        setProjectHours(hours);
        setLoadedForUserId(userId || null);
      } catch (error) {
        console.error('Failed to load Hackatime projects:', error);
      } finally {
        setIsLoadingHackatime(false);
      }
    }

    loadHackatimeProjects();
  }, [session?.user?.id, loadedForUserId, router]); // Only depend on user ID and router

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

  const deleteProjectId = (index: number, projectID: string, userId: string) => (cb: (projectID: string, userId: string) => Promise<unknown>) => {
    cb(projectID, userId).then(() => setProjects(projects.filter((_, i) => i !== index)));
  }

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
        // Press 'e' to edit selected project
        setIsProjectEditModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProjectId, isProjectEditModalOpen, isProjectCreateModalOpen]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    // Call the handler right away to set the initial value
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.progressSection}>
        <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto mb-8">
          <div className="w-full px-4 sm:px-0">
            <span className="flex flex-row items-center gap-2 text-2xl justify-center">
              🧑‍💻
              <ProgressBar value={totalHours} max={60} />
              🏝️
            </span>
            <h3 className="text-center mt-2 text-lg">{totalHours}/60 - {60 - totalHours} more hours to go!</h3>
          </div>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.projectList}>
          <div className="mt-6 w-full">
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
                Tap a project to edit it.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow">
              {projects.map((project, index) => (
                <Project
                  key={project.projectID}
                  {...project}
                  hours={project.hackatime ? projectHours[project.hackatime] || 0 : 0}
                  deleteHandler={deleteProjectId(index, project.projectID, project.userId)}
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
                  selected={selectedProjectId === project.projectID}
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
              <div className={styles.editForm}>
                <div className="flex justify-between items-center mb-6 border-b pb-4">
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
                <form action={projectEditFormAction}>
                  {/* Form inputs remain the same */}
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
                  <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <FormInput
                      fieldName='name'
                      placeholder='Project Name'
                      state={projectEditState}
                      required
                      defaultValue={initialEditState.name}
                    >
                      Project Name
                    </FormInput>
                    <FormInput
                      fieldName='description'
                      placeholder='Description'
                      state={projectEditState}
                      defaultValue={initialEditState.description}
                      required
                    >
                      Description
                    </FormInput>
                  </div>
                  
                  <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Project URLs</h3>
                    <FormInput
                      fieldName='codeUrl'
                      placeholder='Code URL'
                      state={projectEditState}
                      {...(initialEditState.codeUrl && { defaultValue: initialEditState.codeUrl})}
                    >
                      Code URL
                    </FormInput>
                    <FormInput
                      fieldName='playableUrl'
                      placeholder='Playable URL'
                      state={projectEditState}
                      defaultValue={initialEditState.playableUrl}
                    >
                      Playable URL
                    </FormInput>
                    <FormInput
                      fieldName='screenshot'
                      placeholder='Screenshot URL'
                      state={projectEditState}
                      defaultValue={initialEditState.screenshot}
                    >
                      Screenshot URL
                    </FormInput>
                  </div>
                  
                  <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <FormSelect 
                      fieldName='hackatime'
                      placeholder={isLoadingHackatime ? 'Loading projects...' : 'Your Hackatime Projects'}
                      required
                      values={hackatimeProjects}
                      defaultValue={initialEditState.hackatime}
                      disabled={true}
                    >
                      Your Hackatime Project
                    </FormSelect>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-6 bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-2 col-span-2">Project Status</h3>
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
                  <button
                    type="submit"
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors focus:outline-none flex items-center justify-center gap-2"
                    disabled={projectEditPending || isLoadingHackatime}
                  >
                    <Icon glyph="edit" size={18} />
                    Save Changes
                  </button>
                </form>
              </div>
            ) : (
              // Project Detail View
              <ProjectDetail 
                project={projects.find(p => p.projectID === selectedProjectId)!}
                onEdit={() => setIsProjectEditModalOpen(true)}
              />
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
        />
        {/* Edit Project Modal - Mobile Only */}
        <div className="md:hidden">
          <ProjectModal
            isOpen={isProjectEditModalOpen}
            setIsOpen={setIsProjectEditModalOpen}
            formAction={projectEditFormAction}
            state={projectEditState}
            pending={projectEditPending}
            modalTitle='Edit Project!'
            hackatimeProjects={hackatimeProjects}
            isLoadingHackatime={isLoadingHackatime}
            {...initialEditState}
          />
        </div>
        <Toaster richColors />
        {toastMessage && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setToastMessage(null)}
          />
        )}
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
  isLoadingHackatime: boolean
}

function ProjectModal(props: ProjectModalProps) {
  const isCreate = props.modalTitle?.toLowerCase().includes('create');
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={() => props.setIsOpen(false)}
      title={props.modalTitle}
      {...(!isCreate && { okText: "Done" })}
      hideFooter={isCreate}
    >
      <form action={props.formAction}>
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
        
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
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
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
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
                placeholder='Playable URL (optional)'
                state={props.state}
                {...(props.playableUrl && { defaultValue: props.playableUrl})}
              >
                Playable URL (optional)
              </FormInput>
              <FormInput
                fieldName='screenshot'
                placeholder='Screenshot URL (optional)'
                state={props.state}
                {...(props.screenshot && { defaultValue: props.screenshot})}
              >
                Screenshot URL (optional)
              </FormInput>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2 col-span-2">Project Status</h3>
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
          </>
        )}
        
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <FormSelect 
            fieldName='hackatime'
            placeholder={props.isLoadingHackatime ? 'Loading projects...' : 'Your Hackatime Projects'}
            required
            values={props.hackatimeProjects}
            {...(props.hackatime && { defaultValue: props.hackatime})}
            disabled={!isCreate}
          >
            Your Hackatime Project
          </FormSelect>
        </div>
        
        <button
          type="submit"
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors focus:outline-none flex items-center justify-center gap-2"
          disabled={props.pending || props.isLoadingHackatime}
        >
          <Icon glyph={isCreate ? "plus" : "edit"} size={18} />
          {isCreate ? "Create Project" : "Save Changes"}
        </button>
      </form>
    </Modal>
  );
}
