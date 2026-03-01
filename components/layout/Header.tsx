'use client';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import { useSidebar } from '@/lib/sidebarContext';
import { LogOut, User, Menu } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const { toggle } = useSidebar();

  const isSuperadmin = user?.roles?.includes('superadmin');
  const isAdmin = user?.roles?.includes('admin');

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: hamburger on mobile */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="hidden md:block text-sm font-medium text-slate-400">
          CWL Tracker
        </span>
      </div>

      {/* Right: user info + logout */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <span className="hidden sm:block text-sm font-medium text-slate-700">
            {user?.displayName || user?.phone || 'User'}
          </span>
          {isSuperadmin ? (
            <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-semibold">
              Superadmin
            </span>
          ) : isAdmin ? (
            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-semibold">
              Admin
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-semibold">
              User
            </span>
          )}
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

