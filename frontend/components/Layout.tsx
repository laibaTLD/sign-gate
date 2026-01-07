import React from 'react';
import { User, UserRole } from '../types';
import { LogOut, Users, PenTool, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children?: React.ReactNode;
  user: User;
  onLogout: () => void;
  title: string;
}

export default function Layout({ children, user, onLogout, title }: LayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="bg-brand-900 text-white w-full md:w-64 flex-shrink-0">
        <div className="p-6 border-b border-brand-700">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PenTool className="text-yellow-400" />
            SignDesk
          </h1>
          <p className="text-xs text-brand-300 mt-1 uppercase tracking-wider">
            {user.role === UserRole.ADMIN ? 'Admin Portal' : user.role === UserRole.AGENT ? 'Support Portal' : 'Portal'}
          </p>
        </div>

        <nav className="p-4 space-y-2">
          {user.role === UserRole.ADMIN && (
            <>
              <button 
                onClick={() => navigate('/admin')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-brand-800 rounded-lg text-yellow-300 font-medium"
              >
                <Users size={20} /> Agents & Docs
              </button>
            </>
          )}

          {user.role === UserRole.AGENT && (
            <>
              <button 
                onClick={() => navigate('/support')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-lg text-brand-400 font-medium"
              >
                <LayoutDashboard size={20} /> Dashboard
              </button>
            </>
          )}

          <div className="pt-8 mt-8 border-t border-brand-700">
             <div className="px-4 mb-4">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-brand-300 truncate">{user.email}</p>
             </div>
             <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-brand-300 hover:text-white hover:bg-brand-800 rounded transition-colors"
                title="Sign out of this workspace"
              >
                <LogOut size={18} /> Logout
              </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-brand-100 px-6 py-4 flex items-center justify-between shadow-sm z-10">
          <h2 className="text-xl font-semibold text-brand-800">{title}</h2>
          <div className="flex items-center gap-4" />
        </header>

        <div className="flex-1 overflow-auto p-6 relative">
          {children}
        </div>
      </main>
    </div>
  );
}