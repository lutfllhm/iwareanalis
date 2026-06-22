'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck } from 'lucide-react';

export default function IndexPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-[#070b19] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center mx-auto shadow-lg animate-bounce">
          <ShieldCheck className="text-white" size={24} />
        </div>
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">
          Memeriksa sesi otentikasi...
        </p>
      </div>
    </div>
  );
}
