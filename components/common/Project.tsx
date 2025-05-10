'use client'
import type { Project } from "@/app/api/projects/route"
import Icon from "@hackclub/icons"
import { toast } from "sonner"
import Modal from "./Modal"
import { useState, useEffect } from "react";

type ProjectProps = Project & { 
    userId: string, 
    hours: number,
    deleteHandler?: (cb: (projectID: string, userId: string) => Promise<unknown>) => void 
    editHandler?: (project: Project) => void,
    selected?: boolean
};

export function Project({ name, description, codeUrl, playableUrl, screenshot, hackatime, submitted, projectID, deleteHandler, editHandler, userId, hours, selected }: ProjectProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [isMobile, setIsMobile] = useState<boolean>(false);
    
    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    const handleRowClick = (e: React.MouseEvent) => {
        // Don't trigger edit if clicking the delete button
        if ((e.target as HTMLElement).closest('.delete-button')) return;
        
        if (editHandler) {
            editHandler({ 
                name, 
                description, 
                codeUrl, 
                playableUrl, 
                screenshot, 
                hackatime, 
                userId, 
                projectID, 
                submitted,
                viral: false,
                shipped: false,
                in_review: false,
                approved: false
            });
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (deleteHandler) {
            setIsDeleting(true);
            try {
                await deleteHandler(async (projectID, userId) => {
                    try {
                        const response = await fetch(`/api/projects/${projectID}`, {
                            method: 'DELETE'
                        });
                        if (!response.ok) throw new Error('Failed to delete');
                        return response.json();
                    } catch (error) {
                        throw error;
                    }
                });
            } finally {
                setIsDeleting(false);
                setIsOpen(false);
            }
        }
    };

    return (
        <div 
            className={`flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-200 cursor-pointer transition-colors ${
                selected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'bg-white'
            } ${
                isMobile ? 'active:bg-gray-100' : ''
            }`}
            onClick={handleRowClick}
        >
            <div className="flex items-center gap-2 min-w-0 w-full">
                <span className="text-gray-600">{hours}h</span>
                <span className={`font-medium flex-shrink-0 sm:truncate sm:max-w-[12rem] ${selected ? 'text-blue-700' : ''}`}>{name}</span>
                {description && (
                  <span className="text-gray-500 flex-grow truncate min-w-0 ml-2">{description}</span>
                )}
            </div>
            <div className="flex gap-2 items-center">
                <button
                    className="px-3 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors delete-button flex items-center gap-1"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(true);
                    }}>
                    <Icon glyph="delete" size={16} />
                    <span className="text-sm font-medium">Delete</span>
                </button>
            </div>
            <Modal
                isOpen={isOpen}
                title={`Delete ${name}?`}
                onClose={() => setIsOpen(false)}
                okText="Cancel"
                hideFooter={true}
            >
                <div className="space-y-4">
                    <p className="text-gray-700">Are you sure you want to delete this project? This action cannot be undone.</p>
                    
                    <div className="flex gap-3 justify-end">
                        <button
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded focus:outline-none transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                            }}>
                            Cancel
                        </button>
                        
                        <button
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}