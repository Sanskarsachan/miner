import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function V2Index() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to extractions page
    router.push('/extractions');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center">
        <div className="inline-block">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-purple-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-white mt-4">Loading...</p>
      </div>
    </div>
  );
}
