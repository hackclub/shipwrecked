"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./badge.module.css";

// CDN URL for easy swapping
const BADGE_IMAGE_URL =
  "https://hc-cdn.hel1.your-objectstorage.com/s/v3/739361f1d440b17fc9e2f74e49fc185d86cbec14_badge.png";

export default function BadgeGenerator() {
  const { status } = useSession();
  const router = useRouter();
  const [link, setLink] = useState("");
  const [generatedBadge, setGeneratedBadge] = useState("");
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

  const handleGenerateBadge = () => {
    let targetLink = link.trim();

    // Default to shipwrecked.hackclub.com if left blank
    if (!targetLink) {
      targetLink = "https://shipwrecked.hackclub.com";
    } else {
      // Add https:// if not present
      if (
        !targetLink.startsWith("http://") &&
        !targetLink.startsWith("https://")
      ) {
        targetLink = "https://" + targetLink;
      }
    }

    const badgeCode = `<div align="center"><a href="${targetLink}" target="_blank"><img src="${BADGE_IMAGE_URL}" alt="This project is part of Shipwrecked, the world's first hackathon on an island!" style="width: 35%;"></a></div>`;

    setGeneratedBadge(badgeCode);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedBadge);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Shipwrecked Badge Generator</h1>
        <p className={styles.description}>
          Generate a Shipwrecked badge for your project! This badge shows that
          your project is part of Shipwrecked & will put you in the top of the
          review queue & gallery.
        </p>

        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="link" className={styles.label}>
              Link (optional)
            </label>
            <input
              type="text"
              id="link"
              className={styles.input}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Enter your refferal link"
            />
            <p className={styles.hint}>
              Leave blank to use the default Shipwrecked link, or enter your
              project URL
            </p>
          </div>

          <button
            onClick={handleGenerateBadge}
            className={styles.generateButton}
          >
            Generate Badge
          </button>
        </div>

        {generatedBadge && (
          <div className={styles.resultSection}>
            <h2 className={styles.resultTitle}>Your Badge Code</h2>
            <div className={styles.codeBlock}>
              <pre className={styles.code}>{generatedBadge}</pre>
              <button onClick={handleCopy} className={styles.copyButton}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <div className={styles.preview}>
              <h3 className={styles.previewTitle}>Preview</h3>
              <div
                className={styles.previewContent}
                dangerouslySetInnerHTML={{ __html: generatedBadge }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
