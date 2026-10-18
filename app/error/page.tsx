'use client';

export default function ErrorPage() {
  if (typeof window !== 'undefined') {
    throw new Error('This is an intentional 500 error');
  }
  return null;
}
