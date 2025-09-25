// app/demo/skribble-signing/page.tsx
"use client";
import { Suspense } from 'react';
import DemoSkribbleSigning from './DemoSkribbleSigning';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading demo signing interface...</p>
      </div>
    </div>
  );
}

export default function DemoSkribbleSigningPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DemoSkribbleSigning />
    </Suspense>
  );
}