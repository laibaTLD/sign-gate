import React from 'react';
import { PenTool } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-50 gap-4">
      <div className="flex items-center gap-2 text-brand-900">
        <PenTool className="text-yellow-400" size={28} />
        <span className="text-xl font-bold tracking-tight">Sign Flow</span>
      </div>
      <div className="spinner" />
      <p className="text-sm text-brand-500 animate-pulse">{message}</p>
    </div>
  );
}
