'use client';

import styles from '../page.module.css';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

function Loading() {
  return (
    <div className="fixed inset-0 bg-[url(/bay.webp)] bg-cover bg-center">
      <div className="relative flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-5xl md:text-6xl font-serif mb-6 text-white font-bold">
            Loading...
          </p>
        </div>
      </div>
    </div>
  )
}

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

export default function FAQ() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Early return if not authenticated
  if (status === "loading") return <Loading />
  if (status === "unauthenticated") {
    return <AccessDeniedHaiku />;
  }

  return (
    <div className={styles.container}>
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Frequently Asked Questions</h1>
        
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">How does the progress calculation work?</h2>
            <p className="text-gray-600 mb-2">
              Your progress is calculated based on your total hours of development work from Hackatime. Here's how it works:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>The goal is 60 hours of development time</li>
              <li>Each project is capped at a maximum of 15 hours contribution</li>
              <li>If a project goes viral, it automatically counts for 15 hours</li>
              <li>Projects that aren't shipped yet are capped at 14.75 hours</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">What does it mean for a project to be "viral"?</h2>
            <p className="text-gray-600 mb-2">
              A project is considered viral when it reaches a significant level of attention from the community. This includes:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Getting featured on the Hack Club frontpage</li>
              <li>Having 50+ stars on GitHub</li>
              <li>Being shared widely on social media platforms</li>
              <li>Receiving significant engagement from other Hack Clubbers</li>
            </ul>
            <p className="text-gray-600 mt-2">
              When a project goes viral, it automatically counts as 15 hours towards your island journey goal!
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">What does "shipped" mean?</h2>
            <p className="text-gray-600 mb-2">
              A project is considered "shipped" when it's fully deployed and accessible to users. This means:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>The project has a public URL where anyone can access it</li>
              <li>All core functionality is working as intended</li>
              <li>Users can interact with the project without encountering major bugs</li>
            </ul>
            <p className="text-gray-600 mt-2">
              Until a project is marked as shipped, its hours are capped at 14.75, so make sure to deploy your projects!
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">What are the requirements for the island journey?</h2>
            <p className="text-gray-600 mb-2">
              To qualify for the island journey, you need to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Complete at least 60 hours of development time (roughly 15 hours per project)</li>
              <li>Ship 4 fully deployed projects</li>
              <li>Make at least one of your projects go viral</li>
            </ul>
            <p className="text-gray-600 mt-2">
              When your progress bar reaches 100%, you'll be eligible to join us on the amazing island adventure!
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">How do I link my Hackatime projects?</h2>
            <p className="text-gray-600 mb-2">
              To link your Hackatime projects:
            </p>
            <ol className="list-decimal pl-6 text-gray-600 space-y-2">
              <li>Click the "+" button in the Projects section</li>
              <li>Fill out the project details</li>
              <li>Select your Hackatime project from the dropdown</li>
              <li>Submit the form</li>
            </ol>
            <p className="text-gray-600 mt-2">
              This will associate your project with the hours tracked in Hackatime and update your progress accordingly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 