"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./badge.module.css";

// Variables for easy swapping
const BADGE_IMAGE_URL =
  "https://hc-cdn.hel1.your-objectstorage.com/s/v3/739361f1d440b17fc9e2f74e49fc185d86cbec14_badge.png";
const TARGET_LINK = "https://shipwrecked.hackclub.com/?t=ghrm";

export default function BadgeGenerator() {
  const { status } = useSession();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    router.push("/bay/login");
    return null;
  }

  // Show loading while session is loading
  if (status === "loading") {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const badgeCode = `<div align="center">
  <a href="${TARGET_LINK}" target="_blank">
    <img src="${BADGE_IMAGE_URL}" 
         alt="This project is part of Shipwrecked, the world's first hackathon on an island!" 
         style="width: 35%;">
  </a>
</div>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(badgeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.progressSection}>
          <h2 className={styles.title}>
            Shipwrecked Badge
          </h2>
          <div className={styles.badgeSection}>
            <p className={styles.description}>
              Copy the badge below to add to your project&apos;s README!
            </p>
            <p className={styles.description} style={{ fontStyle: 'italic', fontSize: '0.95em', marginTop: '-1rem', marginBottom: '1.5rem' }}>
              You can put your badge anywhere in your readme and it will still count!
            </p>

            <div className={styles.preview}>
              <div
                className={styles.previewContent}
                dangerouslySetInnerHTML={{ __html: badgeCode }}
              />
            </div>

            <div className={styles.codeBlock}>
              <pre className={styles.code}>{badgeCode}</pre>
              <button onClick={handleCopy} className={styles.copyButton}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
