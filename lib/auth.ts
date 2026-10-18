import { getServerSession } from 'next-auth';
import { opts } from '@/app/api/auth/[...nextauth]/route';

export const auth = async () => {
  if (typeof window === 'undefined') {
    return getServerSession(opts);
  }
  return null;
};
