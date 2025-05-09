'use client'
import type { Project } from "@/app/api/projects/route"
import Icon from "@hackclub/icons"
import { toast } from "sonner"
import Modal from "./Modal"
import { useState } from "react";

type ProjectProps = Project & { 
    userId: string, 
    hours: number,
    deleteHandler?: (cb: (projectID: string, userId: string) => Promise<unknown>) => void 
    editHandler?: (project: Project) => void,
    selected?: boolean
};

export function Project({ name, description, codeUrl, playableUrl, screenshot, hackatime, submitted, projectID, deleteHandler, editHandler, userId, hours, selected }: ProjectProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    
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

    return (
        <div 
            className={`flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-200 cursor-pointer transition-colors ${
                selected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'bg-white'
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
                <button
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded focus:outline-none"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (deleteHandler) {
                            deleteHandler(async (projectID, userId) => {
                                try {
                                    const response = await fetch(`/api/projects/${projectID}`, {
                                        method: 'DELETE'
                                    });
                                    if (!response.ok) throw new Error('Failed to delete');
                                    toast.success(`Deleted ${name}`);
                                    return response.json();
                                } catch (error) {
                                    toast.error(`Failed to delete ${name}`);
                                    throw error;
                                }
                            });
                        }
                        setIsOpen(false);
                    }}>Delete</button>
            </Modal>
        </div>
    )
}