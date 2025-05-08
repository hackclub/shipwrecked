'use client'
import type { Project } from "@/app/api/projects/route"
import Icon from "@hackclub/icons"
import { toast } from "sonner"
import Modal from "./Modal"
import { useState } from "react";

const MAX_DESCRIPTION_LENGTH = 330;
type ProjectProps = Project & { 
    userId: string, 
    hours: number,
    deleteHandler?: (cb: (projectID: string, userId: string) => Promise<unknown>) => void 
    editHandler?: (project: Project) => void
};

export function Project({ screenshot, hackatime, submitted, projectID, name, description, codeUrl, playableUrl, deleteHandler, editHandler, userId, hours }: ProjectProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    return (
        <div
            className="p-4 rounded-xl relative w-full max-w-md overflow-hidden border-0 bg-[#47D1F6] shadow-lg"
        >
            <div
                className="absolute bottom-0 left-0 right-0 h-16 bg-[#f9e9c7]"
                style={{
                    clipPath: "polygon(0% 100%, 100% 100%, 100% 0%, 85% 25%, 70% 0%, 55% 25%, 40% 0%, 25% 25%, 10% 0%, 0% 20%)",
                }}
            />
            <div className="flex flex-row items-center justify-between">
                <h2 className="flex flex-row items-center font-sans text-2xl font-extrabold uppercase tracking-wider text-white">
                    <Icon glyph="explore" size={50} />
                    {name}
                    {" "} — {hours} hrs
                </h2>
                <span className="flex flex-row gap-1">
                    <button
                        className="p-1 rounded-xl transition duration-200 ease-in-out transform hover:scale-105 hover:rotate-6 active:scale-90 bg-[#3B2715]"
                        onClick={() => {
                            // trigger edit operation for the project
                            if (editHandler) editHandler({ name, description, codeUrl, playableUrl, screenshot, hackatime, userId, projectID, submitted });
                        }}>
                        <Icon className="text-white" glyph="edit" size={40} />
                    </button>
                    <button
                        className="p-1 rounded-xl transition duration-200 ease-in-out transform hover:scale-105 hover:rotate-6 active:scale-90 bg-red-500"
                        onClick={() => setIsOpen(true)}>
                        <Icon className="text-white" glyph="delete" size={40} />
                    </button>
                </span>
            </div>
           <p className="text-md font-medium text-white mx-6">
                {description.length <= MAX_DESCRIPTION_LENGTH ? description : description.slice(0, MAX_DESCRIPTION_LENGTH) + "..."} 
            </p>
            <div className="relative w-full flex flex-wrap items-center gap-2">
                <a href={codeUrl} className="flex flex-row items-center gap-2 w-40 h-8 m-2 rounded-lg bg-[#4BC679] px-3 py-2 text-md font-bold text-white transition-transform hover:scale-105">
                        <Icon glyph="code" size={30} />
                        View Code
                </a>
                <a href={playableUrl} className="flex flex-row items-center gap-2 w-40 h-8 rounded-lg bg-[#F5E018] px-3 py-2 text-md font-bold text-[#1a5e7a] transition-transform hover:scale-105">
                    <Icon glyph="link" size={30} />
                    Try It!
                </a>
            </div>
            <Modal
                isOpen={isOpen}
                title={`Do you really want to delete ${name}`}
                onClose={() => setIsOpen(false)}
                okText="Cancel"
            >
                <button
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-400"
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
                                    toast.error(`Failed to delete ${name}. Try again later.`);
                                    throw error;
                                }
                            });
                        }
                        setIsOpen(false);
                    }}>Yes</button>
            </Modal>
        </div>
    )
}