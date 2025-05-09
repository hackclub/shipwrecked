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
    editHandler?: (project: Project) => void
};

export function Project({ name, description, codeUrl, playableUrl, screenshot, hackatime, submitted, projectID, deleteHandler, editHandler, userId, hours }: ProjectProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    
    const handleRowClick = (e: React.MouseEvent) => {
        // Don't trigger edit if clicking the delete button
        if ((e.target as HTMLElement).closest('.delete-button')) return;
        
        if (editHandler) {
            editHandler({ name, description, codeUrl, playableUrl, screenshot, hackatime, userId, projectID, submitted });
        }
    };

    return (
        <div 
            className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 border-b border-gray-200 cursor-pointer"
            onClick={handleRowClick}
        >
            <div className="flex items-center gap-2">
                <span className="text-gray-600">{hours}h</span>
                <span className="font-medium">{name}</span>
            </div>
            <div className="flex gap-2">
                <button
                    className="p-1 text-red-500 hover:text-red-700 delete-button"
                    onClick={() => setIsOpen(true)}>
                    <Icon glyph="delete" size={20} />
                </button>
            </div>
            <Modal
                isOpen={isOpen}
                title={`Delete ${name}?`}
                onClose={() => setIsOpen(false)}
                okText="Cancel"
            >
                <button
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded focus:outline-none"
                    onClick={() => {
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