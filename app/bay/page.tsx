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

export default function Bay() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Track if we've loaded projects for this user
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [totalHours, setTotalHours] = useState<number>(0);
  const [isProjectCreateModalOpen, setIsProjectCreateModalOpen] = useState<boolean>(false);
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState<boolean>(false);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [hackatimeProjects, setHackatimeProjects] = useState<Record<string, string>>({});
  const [isLoadingHackatime, setIsLoadingHackatime] = useState(true);

  // Add render tracking
  console.log('🔄 Bay component rendering', { 
    status, 
    userId: session?.user?.id,
    loadedForUserId 
  });

  // Load Hackatime projects once when component mounts or user changes
  useEffect(() => {
    const userId = session?.user?.id;
    console.log('⚡ Effect triggered.', { userId, loadedForUserId });

    // Skip if no user ID or we've already loaded for this user
    if (!userId || userId === loadedForUserId) {
      console.log('⏭️ Skipping load:', !userId ? 'no user ID' : 'already loaded for this user');
      return;
    }

    async function loadHackatimeProjects() {
      try {
        console.log('🚀 Loading Hackatime projects for user:', userId);
        const projects = await getHackatimeProjects();
        console.log(`📦 Received ${projects.length} projects`);
        const formattedProjects = Object.fromEntries(
          projects.map((project: HackatimeProject) => [project.name, project.name])
        );
        setHackatimeProjects(formattedProjects);
        setLoadedForUserId(userId || null);
      } catch (error) {
        console.error('Failed to load Hackatime projects:', error);
      } finally {
        setIsLoadingHackatime(false);
      }
    }

    loadHackatimeProjects();
  }, [session?.user?.id, loadedForUserId]); // Only depend on user ID

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

  if (status === "loading") return <>Loading...</>
  if (status === "unauthenticated") {
    return <AccessDeniedHaiku />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Shipwrecked Bay</h1>
        
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Ships — </span>
            <span className={styles.statValue}>{projects.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Ships at Sea — </span>
            <span className={styles.statValue}>0</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Ships in Port — </span>
            <span className={styles.statValue}>0</span>
          </div>
        </div>

        <div className="w-60">
          <span className="flex flex-row items-center gap-2 text-2xl">
            🧑‍💻
            <ProgressBar value={totalHours} max={60} />
            🏝️
          </span>
          <h3>{totalHours}/60 - {60 - totalHours} more hours to go!</h3>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.modalButton}
            onClick={() => setIsProjectCreateModalOpen(true)}
          >
            Add Project
          </button>
        </div>

        {/* Modal to create new project */}
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

        <h1 className={`${styles.title} my-4`}>Your Projects</h1>
        <div className="grid grid-cols-3 gap-3 my-4">
          {projects.map((project: any) => (
            <Project
              key={project.projectID}
              deleteHandler={deleteProjectId(0, project.projectID, project.userId)}
              hours={project.hours}
              editHandler={(project) => { setIsProjectEditModalOpen(!isProjectEditModalOpen); setInitialEditState(project); }}
              {...project}
            />
          ))}
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
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={() => props.setIsOpen(false)}
      title={props.modalTitle}
      okText="Done"
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
        <FormInput
          fieldName='codeUrl'
          placeholder='Code URL'
          state={props.state}
          required
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
        <FormSelect 
          fieldName='hackatime'
          placeholder={props.isLoadingHackatime ? 'Loading projects...' : 'Your Hackatime Projects'}
          required
          values={props.hackatimeProjects}
          {...(props.hackatime && { defaultValue: props.hackatime})}
        >
          Your Hackatime Project
        </FormSelect>
        <button
          type="submit"
          className="md:my-5 my-4 w-full px-3 sm:px-4 mt-4 focus:outline-2 py-2 bg-[#4BC679] rounded text-white self-center transition transform active:scale-95 hover:scale-105 hover:brightness-110"
          disabled={props.pending || props.isLoadingHackatime}
        >
          Submit!
        </button>
      </form>
    </Modal>
  );
}
