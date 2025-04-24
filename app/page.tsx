"use client";
import { useState, useEffect, Suspense } from "react";
import Story from "@/components/launch/Story";
import { ReactLenis } from "lenis/react";
import LoadingModal from "@/components/common/LoadingModal";
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { PrefillData } from "@/types/prefill";

const loadingMessages = [
  "Swabbing the decks...",
  "Counting the doubloons...",
  "Polishing the cannonballs...",
  "Teaching the parrot to talk...",
  "Burying the treasure...",
  "Filling the rum barrels...",
  "Sharpening the cutlasses...",
  "Mending the sails...",
  "Cleaning the spyglass...",
  "Stocking the galley...",
  "Checking the compass...",
  "Raising the Jolly Roger...",
  "Loading the cannon...",
  "Untying the knots...",
  "Hoisting the anchor...",
  "Dusting off the treasure map...",
  "Filling the water barrels...",
  "Checking the rigging...",
  "Waxing the figurehead...",
  "Preparing the plank...",
];

// Extract the search params logic to a separate client component
function SearchParamsHandler({ children }: { children: (prefillData: PrefillData) => React.ReactNode }) {
  const searchParams = useSearchParams();
  const [prefillData, setPrefillData] = useState<PrefillData>({});

  useEffect(() => {
    const firstName = searchParams.get('first')?.trim().replace(/[^A-Za-z0-9-]/g, '');
    const lastName = searchParams.get('last')?.trim().replace(/[^A-Za-z0-9-]/g, '');
    const email = searchParams.get('email')?.trim().replace(/[^A-Za-z0-9-@.]/g, '');
    const birthdayISO = searchParams.get('birthday')?.trim().replace(/[^A-Za-z0-9-:T]/g, '');

    const formattedBirthday = birthdayISO ? birthdayISO.split('T')[0] : null;

    setPrefillData({
      firstName: firstName,
      lastName: lastName,
      email: email,
      birthday: formattedBirthday,
    });
    console.log("Prefill Data from URL:", { firstName, lastName, email, birthday: formattedBirthday });
  }, [searchParams]);

  return <>{children(prefillData)}</>;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [scrollPercent, setScrollPercent] = useState(0);
  const isLocalEnv = process.env.NODE_ENV === 'development';

  const handleLoadComplete = () => {
    setIsLoading(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const effectiveScrollHeight = scrollHeight - clientHeight;
      setScrollPercent(effectiveScrollHeight > 0 ? scrollTop / effectiveScrollHeight : 0);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const bannerOpacity = Math.max(0, Math.min(1, (0.75 - scrollPercent) / 0.1));

  const imageUrls = [
    "/logo.png",
    "/logo-outline.svg",
    "/calendar-icon.png",
    "/location-icon.png",
    "/sand-logo.png",
    "/bottle.png",
    "/back-arrow.png",
    "/shore.webp",
    ...Array.from({ length: 10 }, (_, i) => `/waves/${i + 1}.webp`),
  ];

  if (isLoading) {
    return (
      <LoadingModal
        titles={loadingMessages}
        imageUrls={imageUrls}
        onLoadComplete={handleLoadComplete}
      />
    );
  }

  return (
    <ReactLenis root>
      <div>
        <main className="h-[1000vh]">
          {bannerOpacity > 0 && (
            <Link href="https://hackclub.com">
              <img
                style={{
                  position: "fixed",
                  top: "20px",
                  left: "0",
                  border: "0",
                  width: "180px",
                  zIndex: "999",
                  opacity: bannerOpacity,
                  transition: "opacity 0.2s ease-out"
                }}
                src="https://assets.hackclub.com/banners/2025.svg"
                alt="Hack Club"
              />
            </Link>
          )}
          {isLocalEnv && (
            <div
              style={{
                position: "fixed",
                bottom: "20px",
                right: "20px",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                color: "white",
                padding: "8px 16px",
                borderRadius: "4px",
                fontSize: "14px",
                zIndex: "999",
                fontFamily: "var(--font-poppins)"
              }}
            >
              LOCAL
            </div>
          )}
          <Suspense fallback={<Story prefillData={{}} />}>
            <SearchParamsHandler>
              {(prefillData) => <Story prefillData={prefillData || {}} />}
            </SearchParamsHandler>
          </Suspense>
        </main>
      </div>
    </ReactLenis>
  );
}
