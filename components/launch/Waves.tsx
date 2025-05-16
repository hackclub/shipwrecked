'use client';
import { motion } from "motion/react";
import { useContext, useMemo, useEffect } from "react";
import { ScrollProgressContext } from "./Story";
import Image from "next/image";

export default function Waves({ start, end }: { start: number | undefined, end: number | undefined }) {
  const [scrollPercent] = useContext(ScrollProgressContext);

  const numFrames = 10; // Number of unique wave images (1-10)
  const totalAnimationFrames = numFrames * 2; // Total steps including reverse

  // Memoize image paths to avoid recalculating strings on every render
  const imagePaths = useMemo(() => 
    Array.from({ length: numFrames }, (_, i) => `/waves/${i + 1}.svg`),
    [numFrames]
  );

  // Preload all images when component mounts
  useEffect(() => {
    // Preload all wave images
    imagePaths.forEach(path => {
      const img = new window.Image(); // Use window.Image constructor for browser
      img.src = path;
    });
  }, [imagePaths]);

  // Calculate current frame index (0 to 19)
  let currentFrameIndex = -1;
  if (start !== undefined && end !== undefined && scrollPercent >= start && scrollPercent <= end) {
    const progressWithinBounds = (scrollPercent - start) / (end - start);
    currentFrameIndex = Math.floor(progressWithinBounds * totalAnimationFrames);
    // Clamp index to be within valid range [0, 19]
    currentFrameIndex = Math.max(0, Math.min(currentFrameIndex, totalAnimationFrames - 1));
  }

  // Determine the image number (1 to 10) based on the frame index
  let imageNumber = -1;
  if (currentFrameIndex !== -1) {
    if (currentFrameIndex < numFrames) {
      // Forward sequence (frames 0-9 correspond to images 1-10)
      imageNumber = currentFrameIndex + 1;
    } else {
      // Reverse sequence (frames 10-19 correspond to images 10-1)
      imageNumber = numFrames * 2 - currentFrameIndex;
    }
  }

  return (
    <motion.div 
      className="fixed inset-0 z-10 pointer-events-none" 
      style={{
        opacity: currentFrameIndex !== -1 ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out' // Smooth fade in/out
      }}
    >
      {/* Render only the currently active image */}
      {imageNumber !== -1 && (
        <Image
          key={imageNumber} // Use imageNumber as key for transitions if needed
          src={imagePaths[imageNumber - 1]} // Use the correct path from memoized array
          alt="" // Decorative image
          fill // Make image cover the container
          sizes="100vw" // Image covers the full viewport width
          priority={true} // Ensure high priority loading for smoothness
          className="object-cover scale-y-[-1]" // Apply existing styling
        />
      )}
    </motion.div>
  );
}
