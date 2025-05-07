'use client';
import styles from './page.module.css';
import Modal from '@/components/common/Modal';
import Toast from '@/components/common/Toast';
import { useState, useEffect, useActionState } from 'react';
import { createProjectAction, FormSave, editProjectAction } from './submit/actions';
import { Project } from '@/components/common/Project';
import FormSelect from '@/components/form/FormSelect';
import FormInput from '@/components/form/FormInput';
import { useSession } from 'next-auth/react';
import { Toaster, toast } from "sonner";
import ProgressBar from '@/components/common/ProgressBar';
import type { ProjectType } from '../api/projects/route';

export default function Bay() {
  const { data: session, status } = useSession();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [totalHours, setTotalHours] = useState<number>(0);
  const [isProjectCreateModalOpen, setIsProjectCreateModalOpen] = useState<boolean>(false);
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
  };

  const [projectCreateState, projectCreateFormAction, projectCreatePending] = useActionState((state: FormSave, payload: FormData) => new Promise<FormSave>((resolve, reject) => {
    toast.promise(createProjectAction(state, payload), {
      loading: "Creating project...",
      error: () => { reject(); return "Failed to create new project" },
      success: data => {
        resolve(data as FormSave);
        setIsProjectCreateModalOpen(false); // close project modal
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
        resolve(data as FormSave);
        setIsProjectEditModalOpen(false); // close project modal
        // delay reloading page 
        setTimeout(() => {
          // reload the page to see applied changes
          location.reload();
        }, 1500);
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

  const [projects, setProjects] = useState([]);
  const [hackatimeProjects, setHackatimeProjects] = useState<Record<string, string>>({});

  const deleteProjectId = (index: number, projectID: string, userId: string) => (cb: (projectID: string, userId: string) => Promise<unknown>) => {
    cb(projectID, userId).then(() => setProjects(projects.filter((_, i) => i !== index)));
  }

  async function getHackatimeProjects() {
    const response = await fetch(`/api/projects?hackatime=true&slackID=${session.user.slack}`);
    return await response.json();
  }

  useEffect(() => {
    getHackatimeProjects()
      .then((r: any[]) => {
        const formattedProjects: Record<string, string> = {};
        r.forEach(project => formattedProjects[project.name] = project);
        setHackatimeProjects(formattedProjects);
      });
  }, [isProjectCreateModalOpen, isProjectEditModalOpen]);

  async function getUserProjects() {
    const response = await fetch("/api/projects");
    const data = await response.json();

   
    setProjects(data);
  }

  useEffect(() => {
    if (Object.keys(hackatimeProjects).length === 0 || projects.length === 0) return;
    // set total hours spent on projects
    const tHours = projects.map((p: any) => hackatimeProjects[p.hackatime]["hours" as any]).reduce((acc, curr) => acc + parseInt(curr), 0);
    setTotalHours(tHours);
  }, [hackatimeProjects, projects]);

  useEffect(() => {
    getUserProjects();
  }, []);  
  
  if (status === "loading") return <>Loading...</>
  if (status === "unauthenticated") {
    return (
      <div className="fixed inset-0 bg-[url(/bay.webp)] bg-cover bg-center">
        <div className="flex items-center justify-center h-full">
          <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl p-8 border border-gray-200 max-w-md w-full mx-4">
            <h1 className="text-3xl font-bold text-center mb-4 text-gray-800">Access Denied</h1>
            <p className="text-gray-600 text-center mb-6">
              Please sign in to access The Bay and continue your journey.
            </p>
            <div className="flex justify-center">
              <a 
                href="/bay/login" 
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
              >
                Sign In
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
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
          
          <a 
            href="/bay/submit" 
            // className={styles.submitLink}
            className="px-4 py-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 active:scale-95 transition font-semibold"
          >
            Submit New Ship
          </a>
        </div>

        {/* Modal to create new project */}
        <ProjectModal
          isOpen={isProjectCreateModalOpen}
          setIsOpen={setIsProjectCreateModalOpen}
          formAction={projectCreateFormAction}
          state={projectCreateState}
          pending={projectCreatePending}
          hackatimeProjects={Object.fromEntries(Object.keys(hackatimeProjects).map(item => [item, item]))}
          modalTitle='Create New Project!'
         /> 

        <ProjectModal
          isOpen={isProjectEditModalOpen}
          setIsOpen={setIsProjectEditModalOpen}
          formAction={projectEditFormAction}
          state={projectEditState}
          pending={projectEditPending}
          hackatimeProjects={Object.fromEntries(Object.keys(hackatimeProjects).map(item => [item, item]))}
          modalTitle='Edit Project!'
          {...initialEditState}
         /> 


        <h1 className={`${styles.title} my-4`}>Your Projects</h1>
        <div className="grid grid-cols-3 gap-3 my-4">
          {projects.map((project: any) => (
            <Project
              key={project.projectID}
              deleteHandler={deleteProjectId(0, project.projectID, project.userId)}
              hours={hackatimeProjects.hasOwnProperty(project.hackatime) ? hackatimeProjects[project.hackatime]["hours" as any] : 0}
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
  formAction: (payload: FormData) => void, // we both know this is a function
  state: FormSave,
  pending: boolean,
  hackatimeProjects: Record<string, string>
  modalTitle: string
}

function ProjectModal(props: ProjectModalProps) {
  return <>
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
              placeholder='Your Hackatime Projects'
              required
              values={props.hackatimeProjects}
              {...(props.hackatime && { defaultValue: props.hackatime})}
              >
                Your Hackatime Project
              </FormSelect>
            <button
              type="submit"
              className="md:my-5 my-4 w-full px-3 sm:px-4 mt-4 focus:outline-2 py-2 bg-[#4BC679] rounded text-white self-center transition transform active:scale-95 hover:scale-105 hover:brightness-110"
              disabled={props.pending}
            >
              Submit!
            </button>
          </form>
        </Modal>
  </>
}
