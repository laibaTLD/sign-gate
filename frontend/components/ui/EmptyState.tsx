import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fadeIn">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-4">
        <Icon size={24} className="text-brand-400" />
      </div>
      <h3 className="text-base font-semibold text-brand-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-brand-500 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}
