'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function HackatimeSetup() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Don't do anything while session is loading
        if (status === 'loading') {
            return;
        }

        // Redirect to login if not authenticated
        if (status === 'unauthenticated') {
            console.log('Not authenticated, redirecting to login');
            router.push('/bay/login');
            return;
        }

        // If we already have a Hackatime ID, redirect to bay
        if (session?.user?.hackatimeId) {
            console.log('Already have Hackatime ID, redirecting to bay');
            // Force a full page reload to ensure session is fresh
            window.location.href = '/bay';
            return;
        }

        let mounted = true;
        const checkStatus = async () => {
            try {
                console.log('📡 Fetching Hackatime status...');
                const response = await fetch('/api/hackatime/status');
                console.log('📥 Status response:', { status: response.status, statusText: response.statusText });
                const data = await response.json();
                console.log('📦 Status data:', data);

                if (!mounted) return;

                if (data.isSetup) {
                    console.log('✅ Hackatime is set up, redirecting to bay');
                    // Force a full page reload to ensure session is fresh
                    window.location.href = '/bay';
                } else {
                    console.log('❌ Hackatime is not set up - waiting...');
                    setIsChecking(false);
                }
            } catch (error) {
                console.error('Error checking Hackatime status:', error);
                if (mounted) {
                    setIsChecking(false);
                }
            }
        };

        // Check immediately and then every 10 seconds
        const interval = setInterval(checkStatus, 10000);
        checkStatus();

        return () => {
            clearInterval(interval);
            mounted = false;
        };
    }, [router, status, session]);

    // Always show the checking setup message
    return (
        <div className="fixed inset-0 bg-[url(/bay.webp)] bg-cover bg-center">
            <div className="relative flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-5xl md:text-6xl font-serif mb-6 text-white font-bold">
                        Checking your setup...
                    </p>
                </div>
            </div>
        </div>
    );
} 