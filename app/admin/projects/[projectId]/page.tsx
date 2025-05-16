"use client"

import { useState, useEffect, useActionState } from 'react';
import { useSession } from 'next-auth/react';
import type { FormSave } from '@/components/form/FormInput';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/lib/hooks';
import Link from 'next/link';
import { ReviewModeProvider } from '@/app/contexts/ReviewModeContext';
import ProjectStatus from '@/app/components/common/ProjectStatus';
import ReviewSection from '@/components/common/ReviewSection';
import ImageWithFallback from '@/components/common/ImageWithFallback';
import { ProjectFlags } from '@/components/common/ProjectFlagsEditor';
import Icon from "@hackclub/icons";
import Modal from '@/components/common/Modal';
import { toast, Toaster } from 'sonner';
import FormInput from '@/components/form/FormInput';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface Project {
  projectID: string;
  name: string;
  description: string;
  codeUrl: string;
  playableUrl: string;
  screenshot: string;
  shipped: boolean;
  viral: boolean;
  approved: boolean;
  in_review: boolean;
  userId: string;
  user: User;
  reviews: { id: string }[];
  hackatime?: string;
  rawHours: number;
  hoursOverride?: number;
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

// Create a wrapper component that will use the ReviewModeProvider
function ProjectDetailContent({ params }: { params: { projectId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState<boolean>(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState<boolean>(false);
  const isMobile = useIsMobile();
  
  const [initialEditState, setInitialEditState] = useState<any>({
    name: "",
    description: "",
    hackatime: "",
    codeUrl: "",
    playableUrl: "",
    screenshot: "",
    userId: "",
    projectID: "",
    rawHours: 0,
    hoursOverride: undefined
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
        resolve(data);
        setIsProjectEditModalOpen(false);
        
        // Update the project with edited data
        if (project) {
          setProject({...project, ...data.data});
        }
        
        return "Project updated successfully"
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
      projectID: "",
      rawHours: 0,
      hoursOverride: undefined
    }
  });
  
  useEffect(() => {
    async function fetchProject() {
      if (status !== 'authenticated') return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/admin/projects/${params.projectId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch project: ${response.statusText}`);
        }
        
        const data = await response.json();
        setProject(data);
      } catch (err) {
        console.error('Error fetching project:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProject();
  }, [params.projectId, status]);
  
  // Handle project flags updates
  const handleFlagsUpdated = (updatedProject: any) => {
    if (project) {
      setProject({
        ...project,
        shipped: updatedProject.shipped,
        viral: updatedProject.viral,
        in_review: updatedProject.in_review,
        approved: updatedProject.approved
      });
    }
  };

  // This useEffect watches for changes to project and initialEditState
  // and ensures the project edit form fields are properly synchronized
  useEffect(() => {
    if (project) {
      // Update initialEditState with current project values
      setInitialEditState({
        name: project.name || "",
        description: project.description || "",
        hackatime: project.hackatime || "",
        codeUrl: project.codeUrl || "",
        playableUrl: project.playableUrl || "",
        screenshot: project.screenshot || "",
        userId: project.userId || "",
        projectID: project.projectID || "",
        viral: project.viral || false,
        shipped: project.shipped || false,
        in_review: project.in_review || false,
        approved: project.approved || false,
        rawHours: project.rawHours || 0,
        hoursOverride: project.hoursOverride
      });
    }
  }, [project]);

  useEffect(() => {
    if (initialEditState.projectID) {
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
        approved: initialEditState.approved || false,
        rawHours: initialEditState.rawHours || 0,
        hoursOverride: initialEditState.hoursOverride
      };
    }
  }, [initialEditState, projectEditState]);
  
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

  if (error || !project) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
        <p className="text-gray-600 mb-6">{error || 'Project not found'}</p>
        <Link 
          href="/admin/projects"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  // Prepare project flags
  const projectFlags: ProjectFlags = {
    shipped: !!project.shipped,
    viral: !!project.viral,
    in_review: !!project.in_review
  };

  return (
    <div className={isMobile ? "pb-20" : ""}>
      <div className="mb-6 flex items-center">
        <Link 
          href="/admin/projects"
          className="text-blue-600 hover:text-blue-800 mr-3"
        >
          ← Back to Projects
        </Link>
        <h1 className="text-2xl font-bold">{project.name}</h1>
        {!isMobile && (
          <button
            className="ml-auto flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            onClick={() => {
              setIsProjectEditModalOpen(true);
            }}
            aria-label="Edit project"
          >
            <span>Edit</span>
          </button>
        )}
      </div>
      
      <div className="space-y-6">
        {/* Project Description */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
          <p className="text-base text-gray-900">{project.description || "No description provided."}</p>
        </div>
        
        {/* Project Status */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-center text-sm">
            <ProjectStatus 
              viral={project.viral} 
              shipped={project.shipped} 
              in_review={project.in_review}
            />
          </div>
        </div>
        
        {/* Status Flags */}
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
        </div>
        
        {/* Project Hours */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Project Hours</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">Raw Hackatime Hours</span>
              <p className="text-lg font-semibold mt-1">{project.rawHours}h</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Admin Hours Override</span>
              <p className="text-lg font-semibold mt-1">
                {project.hoursOverride !== undefined && project.hoursOverride !== null 
                  ? `${project.hoursOverride}h` 
                  : '—'}
              </p>
            </div>
            <div className="col-span-2 mt-2">
              <span className="text-sm text-gray-500">Effective Hours</span>
              <p className="text-lg font-semibold text-blue-600 mt-1">
                {(project.hoursOverride !== undefined && project.hoursOverride !== null) 
                  ? `${project.hoursOverride}h` 
                  : `${project.rawHours}h`}
              </p>
            </div>
          </div>
        </div>
        
        {/* User Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Creator</h3>
          <div className="flex items-center">
            {project.user.image ? (
              <img 
                src={project.user.image} 
                alt={project.user.name || 'User'} 
                className="w-10 h-10 rounded-full object-cover mr-3"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                <span className="text-gray-600 font-bold">
                  {(project.user.name || project.user.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium">{project.user.name || 'Unknown'}</p>
              <p className="text-sm text-gray-500">{project.user.email}</p>
            </div>
          </div>
        </div>
        
        {/* Project Links */}
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
        
        {/* Project Screenshot */}
        {project.screenshot && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Screenshot</h3>
            <div className="relative w-full h-64 rounded-lg border border-gray-200 overflow-hidden">
              <ImageWithFallback
                src={project.screenshot}
                alt={project.name}
                fill
                className="object-contain"
              />
            </div>
          </div>
        )}
        
        {/* Reviews Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <ReviewSection 
            projectID={project.projectID}
            initialFlags={projectFlags}
            onFlagsUpdated={handleFlagsUpdated}
          />
        </div>
      </div>

      {/* Edit Project Modal */}
      <Modal
        isOpen={isProjectEditModalOpen}
        onClose={() => setIsProjectEditModalOpen(false)}
        title="Edit Project"
        hideFooter={true}
      >
        <form action={projectEditFormAction}>
          <input type="hidden" name="projectID" value={project.projectID} />
          
          <div className="mb-5 bg-gray-50 p-4 rounded-lg">
            <FormInput
              fieldName='name'
              placeholder='Project Name'
              state={projectEditState}
              required
              defaultValue={project.name}
            >
              Project Name
            </FormInput>
            <FormInput
              fieldName='description'
              placeholder='Description'
              state={projectEditState}
              defaultValue={project.description}
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
              defaultValue={project.codeUrl || ""}
            >
              Code URL
            </FormInput>
            <FormInput
              fieldName='playableUrl'
              placeholder='Playable URL'
              state={projectEditState}
              defaultValue={project.playableUrl || ""}
            >
              Playable URL
            </FormInput>
            <FormInput
              fieldName='screenshot'
              placeholder='Screenshot URL'
              state={projectEditState}
              defaultValue={project.screenshot || ""}
            >
              Screenshot URL
            </FormInput>
          </div>
          
          <div className="mb-5 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Project Hours</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FormInput
                  fieldName='rawHours'
                  placeholder='Raw Hours'
                  type="number"
                  state={projectEditState}
                  defaultValue={project.rawHours.toString()}
                  disabled={true}
                >
                  <div className="flex items-center">
                    Raw Hackatime Hours 
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      Read Only
                    </span>
                  </div>
                </FormInput>
              </div>
              <div>
                <label htmlFor="hoursOverride" className="block text-sm font-medium text-gray-700 mb-1">
                  Override Hours (optional)
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    id="hoursOverride"
                    name="hoursOverride"
                    className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g. 12.5"
                    defaultValue={project.hoursOverride !== undefined ? project.hoursOverride.toString() : ''}
                    step="0.1"
                  />
                  <span className="ml-3 text-sm text-gray-500">
                    (Hackatime reported: {project.rawHours}h)
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-5 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3 col-span-2">Project Status</h3>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="shipped" 
                name="shipped" 
                defaultChecked={project.shipped}
                className="mr-2" 
              />
              <label htmlFor="shipped" className="text-sm text-gray-700">Shipped</label>
            </div>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="viral" 
                name="viral" 
                defaultChecked={project.viral}
                className="mr-2" 
              />
              <label htmlFor="viral" className="text-sm text-gray-700">Viral</label>
            </div>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="in_review" 
                name="in_review" 
                defaultChecked={project.in_review}
                className="mr-2" 
              />
              <label htmlFor="in_review" className="text-sm text-gray-700">In Review</label>
            </div>
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
              onClick={() => setIsDeleteConfirmModalOpen(true)}
            >
              <Icon glyph="delete" size={16} />
              <span>Delete Project</span>
            </button>
          </div>
          
          <div className="sticky bottom-0 left-0 right-0 p-4 mt-4 bg-white border-t border-gray-200 z-20">
            <button
              type="submit"
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors focus:outline-none flex items-center justify-center gap-2"
              disabled={projectEditPending}
            >
              Save Changes
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
            Are you sure you want to delete <span className="font-medium">{project.name}</span>?
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
              onClick={async () => {
                try {
                  const response = await fetch(`/api/admin/projects/${project.projectID}`, {
                    method: 'DELETE'
                  });
                  
                  if (!response.ok) throw new Error('Failed to delete project');
                  
                  toast.success(`Project "${project.name}" deleted successfully`);
                  
                  // Navigate back to projects list
                  router.push('/admin/projects');
                  
                } catch (error) {
                  toast.error(`Failed to delete project: ${error}`);
                  console.error('Error deleting project:', error);
                }
                
                setIsDeleteConfirmModalOpen(false);
              }}
            >
              Delete Project
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Mobile Edit Button Overlay */}
      {isMobile && (
        <div className="sticky bottom-0 left-0 right-0 p-4 mt-4 bg-white border-t border-gray-200 z-20">
          <button
            type="button"
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors focus:outline-none flex items-center justify-center gap-2"
            onClick={() => {
              setIsProjectEditModalOpen(true);
            }}
          >
            Edit Project
          </button>
        </div>
      )}
      
      <Toaster richColors />
    </div>
  );
}

// Main component that wraps the content with ReviewModeProvider
export default function ProjectDetail({ params }: { params: { projectId: string } }) {
  return (
    <ReviewModeProvider>
      <ProjectDetailContent params={params} />
    </ReviewModeProvider>
  );
} 