import { notFound } from 'next/navigation';

export default function AccessDeniedStaticPage() {
  // This will redirect to the not-found.tsx component
  return notFound();
} 