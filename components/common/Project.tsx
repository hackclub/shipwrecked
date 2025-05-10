'use client'
import type { Project } from "@/app/api/projects/route"
import Icon from "@hackclub/icons"
import { toast } from "sonner"
import { useState, useEffect } from "react";

type ProjectProps = Project & { 
    userId: string, 
    hours: number,
    editHandler?: (project: Project) => void,
    selected?: boolean
};

export function Project({ name, description, codeUrl, playableUrl, screenshot, hackatime, submitted, projectID, editHandler, userId, hours, selected, viral, shipped, in_review, approved }: ProjectProps) {
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
                viral: !!viral,
                shipped: !!shipped,
                in_review: !!in_review,
                approved: !!approved
            });
        }
    };

    return (
        <div 
            className={`flex items-center p-3 hover:bg-gray-50 border-b border-gray-200 cursor-pointer transition-colors ${
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
        </div>
    )
}