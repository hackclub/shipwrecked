'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  [key: string]: any;
}

/**
 * ImageWithFallback component that handles image loading errors
 * and displays a fallback UI when images fail to load
 */
const ImageWithFallback = ({ src, alt, ...props }: ImageWithFallbackProps) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);

  useEffect(() => {
    setImgSrc(src);
    setError(false);
  }, [src]);

  if (error) {
    return (
      <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
        <span className="text-gray-500">Image could not be loaded</span>
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      onError={() => setError(true)}
    />
  );
};

export default ImageWithFallback; 