import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { LogOut, Users, PenTool, LayoutDashboard, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children?: React.ReactNode;
  user: User;
  onLogout: () => void;
  title: string;
}

export default function Layout({ children, user, onLogout, title }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const portalLabel = user.role === UserRole.ADMIN ? 'Admin Portal' : 'Support Portal';
  const navItems = user.role === UserRole.ADMIN
    ? [{ path: '/admin', label: 'Agents & Docs', icon: Users }]
    : [{ path: '/support', label: 'Dashboard', icon: LayoutDashboard }];

  const NavButton = ({ path, label, icon: Icon }: { path: string; label: string; icon: typeof Users }) => {
    const active = location.pathname === path;
    return (
      <button
        onClick={() => { navigate(path); setMobileOpen(false); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
          active
            ? 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/20'
            : 'text-brand-300 hover:text-white hover:bg-brand-800'
        }`}
      >
        <Icon size={18} />
        {label}
      </button>
    );
  };

  const sidebar = (
    <>
      <div className="p-5 border-b border-brand-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-yellow-400 flex items-center justify-center">
            <PenTool size={18} className="text-brand-900" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Sign Flow</h1>
            <p className="text-[10px] text-brand-400 uppercase tracking-widest font-medium">{portalLabel}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavButton key={item.path} {...item} />
        ))}
      </nav>

      <div className="p-3 border-t border-brand-700/60">
        <div className="px-3 py-3 mb-1 rounded-lg bg-brand-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-400/20 text-yellow-300 flex items-center justify-center text-xs font-bold uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-brand-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-brand-400 hover:text-white hover:bg-brand-800 rounded-lg transition-colors"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-brand-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:sticky md:top-0 md:h-screen md:max-h-screen w-60 bg-brand-900 text-white flex-col shrink-0 overflow-y-auto">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-screen max-h-screen bg-brand-900 text-white flex flex-col shadow-2xl animate-slideUp overflow-y-auto">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 text-brand-400 hover:text-white"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-brand-100 px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 rounded-md text-brand-600 hover:bg-brand-50"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-semibold text-brand-900 tracking-tight">{title}</h2>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto animate-fadeIn">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
