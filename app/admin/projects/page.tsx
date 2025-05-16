"use client"

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import ImageWithFallback from '@/components/common/ImageWithFallback';
import Modal from '@/components/common/Modal';
import FormInput from '@/components/form/FormInput';
import { toast, Toaster } from 'sonner';

// Force dynamic rendering to prevent prerendering errors during build
export const dynamic = 'force-dynamic';

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
  in_review: boolean;
  userId: string;
  user: User;
  reviews: { id: string }[];
  rawHours: number;
  hoursOverride?: number;
}

// Type for form state
interface FormSave {
  errors?: Record<string, string[]>;
  data?: any;
}

async function editProjectAction(formData: FormData) {
  try {
    const response = await fetch('/api/projects', {
      method: 'PUT',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to edit project');
    }

    return await response.json();
  } catch (error) {
    console.error('Error editing project:', error);
    throw error;
  }
}

// Create a wrapper component that uses Suspense
function AdminProjectsContent() {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoadingProjectDetails, setIsLoadingProjectDetails] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(true); // Set to true by default for desktop
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormSave>({
    errors: undefined,
    data: {
      name: "",
      description: "",
      codeUrl: "",
      playableUrl: "",
      screenshot: "",
      userId: "",
      projectID: ""
    }
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmProjectName, setConfirmProjectName] = useState('');
  
  // Get the current filter from URL
  const currentFilter = searchParams.get('filter') || 'all';
  // Get the selected project ID from URL if available
  const selectedProjectId = searchParams.get('projectId');
  
  // Handle form submission
  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      
      // Explicitly handle checkbox values to ensure proper boolean setting
      const statusFields = ['shipped', 'viral', 'in_review'];
      statusFields.forEach(field => {
        // If the checkbox exists in the form
        const checkbox = form.elements.namedItem(field) as HTMLInputElement;
        // Set value to 'true' or 'false' string since FormData will be converted properly in the API
        formData.set(field, checkbox?.checked ? 'true' : 'false');
      });
      
      const result = await editProjectAction(formData);
      
      if (result.data) {
        // Update the project in the list with the updated status values
        if (selectedProject) {
          const updatedProject = { ...selectedProject, ...result.data };
          setSelectedProject(updatedProject);
          setProjects(prevProjects => 
            prevProjects.map(p => 
              p.projectID === updatedProject.projectID ? updatedProject : p
            )
          );
        }
        
        toast.success("Project updated successfully");
        setIsEditModalOpen(false);
        
        // Update URL to remove projectId if on mobile
        if (window.innerWidth < 768) {
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('projectId');
          router.push(`/admin/projects?${newParams.toString()}`);
          
          // After transition, clear selected project
          setTimeout(() => {
            setSelectedProject(null);
          }, 300);
        }
      } else if (result.errors) {
        setFormState({
          errors: result.errors,
          data: formState.data
        });
        toast.error("Failed to update project");
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error("Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  useEffect(() => {
    async function fetchProjects() {
      try {
        const url = currentFilter === 'all' 
          ? '/api/admin/projects' 
          : `/api/admin/projects?filter=${currentFilter}`;
          
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
          
          // If there's a selected project ID in the URL, find that project
          if (selectedProjectId) {
            const project = data.find((p: Project) => p.projectID === selectedProjectId);
            if (project) {
              setSelectedProject(project);
              setIsEditModalOpen(true);
              // Also show mobile modal if on mobile
              setShowMobileModal(window.innerWidth < 768);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (status === 'authenticated') {
      fetchProjects();
    }
    
    // Add event listener for window resize to handle modal display
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowMobileModal(false);
      } else if (selectedProject) {
        setShowMobileModal(true);
      }
    };
    
    // Add keyboard event listener for ESC key to deselect project
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedProject) {
        handleCloseModal();
      }
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [status, currentFilter, selectedProjectId]);

  // Filter projects based on search term
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Change the current filter
  const handleFilterChange = (filter: string) => {
    router.push(`/admin/projects${filter === 'all' ? '' : `?filter=${filter}`}`);
  };

  // Handle selecting a project
  const handleProjectSelect = (project: Project) => {
    // If clicking the same project that's already selected, just close the panel
    if (selectedProject && selectedProject.projectID === project.projectID) {
      handleCloseModal();
      return;
    }
    
    // Otherwise, select the new project
    setSelectedProject(project);
    
    // Set initial values for the form state
    setFormState({
      ...formState,
      data: {
        name: project.name || "",
        description: project.description || "",
        codeUrl: project.codeUrl || "",
        playableUrl: project.playableUrl || "",
        screenshot: project.screenshot || "",
        userId: project.userId || "",
        projectID: project.projectID || "",
      }
    });
    
    // Open the edit modal
    setIsEditModalOpen(true);
    
    // Show modal on mobile
    if (window.innerWidth < 768) {
      setShowMobileModal(true);
    }
    
    // Update URL to include the selected project ID
    const newParams = new URLSearchParams(searchParams);
    newParams.set('projectId', project.projectID);
    router.push(`/admin/projects?${newParams.toString()}`);
  };

  // Close the edit modal
  const handleCloseModal = () => {
    setShowMobileModal(false);
    setIsEditModalOpen(false);
    // Update URL to remove projectId
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('projectId');
    router.push(`/admin/projects?${newParams.toString()}`);
    // After transition, clear selected project
    setTimeout(() => {
      setSelectedProject(null);
    }, 300);
  };

  // Generate status badge for a project
  const StatusBadge = ({ project }: { project: Project }) => {
    const badges = [];
    
    if (project.in_review) {
      badges.push(<span key="in_review" className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold mr-1 mb-1">In Review</span>);
    }
    if (project.shipped) {
      badges.push(<span key="shipped" className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold mr-1 mb-1">Shipped</span>);
    }
    if (project.viral) {
      badges.push(<span key="viral" className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold mr-1 mb-1">Viral</span>);
    }
    
    return badges.length > 0 ? <div className="flex flex-wrap" style={{ display: 'flex' }}>{badges}</div> : null;
  };

  // Function to handle project deletion
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    
    // Extra verification - check if project name matches confirmation input
    if (confirmProjectName !== projectToDelete.name) {
      toast.error("Project name doesn't match. Deletion aborted.");
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/projects/${projectToDelete.projectID}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove the project from the state
        setProjects(prevProjects => 
          prevProjects.filter(p => p.projectID !== projectToDelete.projectID)
        );
        
        // If the deleted project was selected, clear selection
        if (selectedProject && selectedProject.projectID === projectToDelete.projectID) {
          setSelectedProject(null);
          setIsEditModalOpen(false);
          
          // Update URL to remove projectId
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('projectId');
          router.push(`/admin/projects?${newParams.toString()}`);
        }
        
        toast.success('Project deleted successfully');
        setShowDeleteModal(false);
        setConfirmProjectName(''); // Reset input
      } else {
        const error = await response.json();
        toast.error(`Failed to delete project: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Function to open the delete confirmation modal - remove event param since it's only used from editor now
  const openDeleteModal = (project: Project) => {
    setProjectToDelete(project);
    setConfirmProjectName(''); // Reset the confirmation input 
    setShowDeleteModal(true);
  };

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

  return (
    <div className="flex flex-col md:flex-row md:space-x-6">
      {/* Projects List Panel */}
      <div className="w-full md:w-1/2 lg:w-3/5">
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-4 flex-wrap">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1 rounded-full text-sm mb-1 ${
                currentFilter === 'all' 
                  ? 'bg-gray-200 text-gray-800 outline outline-2 outline-black' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('in_review')}
              className={`px-3 py-1 rounded-full text-sm mb-1 ${
                currentFilter === 'in_review' 
                  ? 'bg-yellow-200 text-yellow-800 outline outline-2 outline-black' 
                  : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
              }`}
            >
              In Review
            </button>
            <button
              onClick={() => handleFilterChange('shipped')}
              className={`px-3 py-1 rounded-full text-sm mb-1 ${
                currentFilter === 'shipped' 
                  ? 'bg-green-200 text-green-800 outline outline-2 outline-black' 
                  : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
            >
              Shipped
            </button>
            <button
              onClick={() => handleFilterChange('viral')}
              className={`px-3 py-1 rounded-full text-sm mb-1 ${
                currentFilter === 'viral' 
                  ? 'bg-purple-200 text-purple-800 outline outline-2 outline-black' 
                  : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
              }`}
            >
              Viral
            </button>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute right-3 top-3 text-gray-400">
              🔍
            </span>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">No projects found matching your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-3">
                {filteredProjects.map((project) => (
                  <div 
                    key={project.projectID} 
                    className={`bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                      selectedProject?.projectID === project.projectID ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleProjectSelect(project)}
                  >
                    <div className="relative h-28 w-full">
                      {project.screenshot ? (
                        <ImageWithFallback
                          src={project.screenshot} 
                          alt={project.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400">No Screenshot</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <h3 className="font-medium text-sm truncate mb-1">{project.name}</h3>
                      <div className="mb-2" style={{ minHeight: '24px' }}>
                        <StatusBadge project={project} />
                      </div>
                      <p className="text-gray-600 text-xs line-clamp-1 mb-1">{project.description}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          {project.user.image ? (
                            <img 
                              src={project.user.image} 
                              alt={project.user.name || 'User'} 
                              className="w-4 h-4 rounded-full object-cover mr-1"
                            />
                          ) : (
                            <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center mr-1">
                              <span className="text-xs text-gray-600">
                                {(project.user.name || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-xs text-gray-600 truncate max-w-[80px]">
                            {project.user.name || 'User'}
                          </span>
                          {project.reviews.length > 0 && (
                            <span className="ml-1 text-xs bg-blue-50 text-blue-600 px-1 py-0.5 rounded">
                              {project.reviews.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Project Edit Panel - Desktop */}
      <div className="hidden md:block md:w-1/2 lg:w-2/5 bg-white rounded-lg shadow-lg p-4 h-fit sticky top-4">
        {selectedProject ? (
          <form onSubmit={handleFormSubmit} key={selectedProject.projectID}>
            <h2 className="text-xl font-bold mb-4">Edit {selectedProject.name}</h2>
            <input type="hidden" name="projectID" value={selectedProject.projectID} />
            
            <div className="mb-5 bg-gray-50 p-4 rounded-lg">
              <FormInput
                fieldName='name'
                placeholder='Project Name'
                state={formState}
                required
                defaultValue={selectedProject.name}
              >
                Project Name
              </FormInput>
              <FormInput
                fieldName='description'
                placeholder='Description'
                state={formState}
                defaultValue={selectedProject.description}
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
                state={formState}
                defaultValue={selectedProject.codeUrl || ""}
              >
                Code URL
              </FormInput>
              <FormInput
                fieldName='playableUrl'
                placeholder='Playable URL'
                state={formState}
                defaultValue={selectedProject.playableUrl || ""}
              >
                Playable URL
              </FormInput>
              <FormInput
                fieldName='screenshot'
                placeholder='Screenshot URL'
                state={formState}
                defaultValue={selectedProject.screenshot || ""}
              >
                Screenshot URL
              </FormInput>
            </div>
            
            <div className="mb-5 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Project Hours</h3>
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
                    defaultValue={selectedProject.hoursOverride !== undefined ? selectedProject.hoursOverride.toString() : ''}
                    step="0.1"
                  />
                  <span className="ml-3 text-sm text-gray-500">
                    (Hackatime reported: {selectedProject.rawHours}h)
                  </span>
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
                  defaultChecked={selectedProject.shipped}
                  className="mr-2" 
                />
                <label htmlFor="shipped" className="text-sm text-gray-700">Shipped</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="viral" 
                  name="viral" 
                  defaultChecked={selectedProject.viral}
                  className="mr-2" 
                />
                <label htmlFor="viral" className="text-sm text-gray-700">Viral</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="in_review" 
                  name="in_review" 
                  defaultChecked={selectedProject.in_review}
                  className="mr-2" 
                />
                <label htmlFor="in_review" className="text-sm text-gray-700">In Review</label>
              </div>
            </div>
            
            <div className="sticky bottom-0 left-0 right-0 p-4 mt-4 bg-white border-t border-gray-200 z-20">
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-grow px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors focus:outline-none"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => openDeleteModal(selectedProject)}
                  className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors focus:outline-none"
                  disabled={isSubmitting}
                >
                  Delete
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center h-[500px] text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            <p>Select a project to edit</p>
          </div>
        )}
      </div>
      
      {/* Mobile Modal Overlay */}
      {showMobileModal && selectedProject && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={handleCloseModal}
              className="absolute top-3 right-3 z-10 bg-white rounded-full p-1 shadow-md"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <form onSubmit={handleFormSubmit} className="p-4" key={`mobile-${selectedProject.projectID}`}>
              <h2 className="text-xl font-bold mb-4">Edit {selectedProject.name}</h2>
              <input type="hidden" name="projectID" value={selectedProject.projectID} />
              
              <div className="mb-5 bg-gray-50 p-4 rounded-lg">
                <FormInput
                  fieldName='name'
                  placeholder='Project Name'
                  state={formState}
                  required
                  defaultValue={selectedProject.name}
                >
                  Project Name
                </FormInput>
                <FormInput
                  fieldName='description'
                  placeholder='Description'
                  state={formState}
                  defaultValue={selectedProject.description}
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
                  state={formState}
                  defaultValue={selectedProject.codeUrl || ""}
                >
                  Code URL
                </FormInput>
                <FormInput
                  fieldName='playableUrl'
                  placeholder='Playable URL'
                  state={formState}
                  defaultValue={selectedProject.playableUrl || ""}
                >
                  Playable URL
                </FormInput>
                <FormInput
                  fieldName='screenshot'
                  placeholder='Screenshot URL'
                  state={formState}
                  defaultValue={selectedProject.screenshot || ""}
                >
                  Screenshot URL
                </FormInput>
              </div>
              
              <div className="mb-5 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Project Hours</h3>
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
                      defaultValue={selectedProject.hoursOverride !== undefined ? selectedProject.hoursOverride.toString() : ''}
                      step="0.1"
                    />
                    <span className="ml-3 text-sm text-gray-500">
                      (Hackatime reported: {selectedProject.rawHours}h)
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-5 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-3 col-span-2">Project Status</h3>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="shipped-mobile" 
                    name="shipped" 
                    defaultChecked={selectedProject.shipped}
                    className="mr-2" 
                  />
                  <label htmlFor="shipped-mobile" className="text-sm text-gray-700">Shipped</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="viral-mobile" 
                    name="viral" 
                    defaultChecked={selectedProject.viral}
                    className="mr-2" 
                  />
                  <label htmlFor="viral-mobile" className="text-sm text-gray-700">Viral</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="in_review-mobile" 
                    name="in_review" 
                    defaultChecked={selectedProject.in_review}
                    className="mr-2" 
                  />
                  <label htmlFor="in_review-mobile" className="text-sm text-gray-700">In Review</label>
                </div>
              </div>
              
              <div className="sticky bottom-0 left-0 right-0 p-4 mt-4 bg-white border-t border-gray-200 z-20">
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="flex-grow px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors focus:outline-none"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteModal(selectedProject)}
                    className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors focus:outline-none"
                    disabled={isSubmitting}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal with name verification */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete the project{" "}
                <span className="font-semibold">{projectToDelete?.name || 'Unknown'}</span>?
                This action cannot be undone and will also delete all associated reviews.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      For extra security, please type the project name to confirm deletion.
                    </p>
                  </div>
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type "{projectToDelete?.name}" to confirm:
              </label>
              <input
                type="text"
                value={confirmProjectName}
                onChange={(e) => setConfirmProjectName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Project name"
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setProjectToDelete(null);
                  setConfirmProjectName('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                className={`px-4 py-2 text-white rounded ${
                  confirmProjectName === projectToDelete?.name
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-red-300 cursor-not-allowed'
                }`}
                disabled={isDeleting || confirmProjectName !== projectToDelete?.name}
              >
                {isDeleting ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Toaster richColors />
    </div>
  );
}

// Main component that wraps the content with Suspense
export default function AdminProjects() {
  return (
    <Suspense fallback={<div>Loading projects...</div>}>
      <AdminProjectsContent />
    </Suspense>
  );
} 