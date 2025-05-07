'use client';
import { useEffect, useState } from "react";
import LoginOptions from "./options";
import { useRouter } from "next/navigation";

// Login Page (/bay/login)
export default function LoginPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-[url(/bay.webp)] bg-cover bg-center">
      <div className="relative flex items-center justify-center h-full">
        <div
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.5s ease-in"
          }}
        >
          <div className="flex justify-center flex-col items-center my-4 rounded-lg bg-white p-2">
            <LoginOptions />
          </div>
        </div>
      </div>
    </div>
  );
}

function AccessDeniedHaiku() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade in after 1.0s
    const fadeInTimer = setTimeout(() => setVisible(true), 1000);
    // Fade out 0.5s before redirect (so at 2.0s)
    const fadeOutTimer = setTimeout(() => setVisible(false), 2000);
    // Redirect after fade-out completes (2.5s)
    const redirectTimer = setTimeout(() => {
      router.push('/bay/login');
    }, 2500);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <div className="fixed inset-0 bg-[url(/bay.webp)] bg-cover bg-center">
      <div className="relative flex items-center justify-center h-full">
        <div
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.5s ease-in',
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
