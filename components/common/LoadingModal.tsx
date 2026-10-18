'use client';
import { useEffect, useState } from 'react';
import styles from './LoadingModal.module.css';

interface LoadingModalProps {
  onLoadComplete: () => void;
  titles: string[];
  imageUrls: string[];
}

const LoadingModal: React.FC<LoadingModalProps> = ({ onLoadComplete, titles, imageUrls }) => {
  const [progress, setProgress] = useState(0);
  const [showLoader, setShowLoader] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(titles[0]);

  const areImagesCached = async (): Promise<boolean> => {
    // Always return false to force showing the loader
    return false;
  };

  const preloadImages = async () => {
    const imageCount = imageUrls.length;
    let loadedCount = 0;

    const loadImage = (src: string): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          setProgress(Math.round((loadedCount / imageCount) * 100));
          resolve();
        };
        img.onerror = () => {
          loadedCount++;
          setProgress(Math.round((loadedCount / imageCount) * 100));
          resolve();
        };
        img.src = src;
      });
    };

    // Load all images
    const imagePromises = imageUrls.map((url) => loadImage(url));

    try {
      await Promise.all(imagePromises);
      setTimeout(() => {
        onLoadComplete();
      }, 500);
    } catch (error) {
      console.error('Error preloading images:', error);
      setTimeout(() => {
        onLoadComplete();
      }, 1000);
    }
  };

  useEffect(() => {
    const checkCacheAndLoad = async () => {
      const cached = await areImagesCached();
      if (cached) {
        // If all images are cached, skip the loader
        onLoadComplete();
      } else {
        // If not all images are cached, show loader and preload
        setShowLoader(true);
        preloadImages();
      }
    };

    checkCacheAndLoad();
  }, [onLoadComplete, imageUrls]);

  // Rotate through titles every 5 seconds
  useEffect(() => {
    if (!showLoader) return;

    const interval = setInterval(() => {
      setCurrentTitle((prevTitle) => {
        // Get all titles except the current one
        const otherTitles = titles.filter((t) => t !== prevTitle);
        // Pick a random one
        return otherTitles[Math.floor(Math.random() * otherTitles.length)];
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [showLoader, titles]);

  if (!showLoader) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.title}>{currentTitle}</h2>
        <div className={styles.spinner} />
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.progressText}>{progress}%</div>
      </div>
    </div>
  );
};

export default LoadingModal;
