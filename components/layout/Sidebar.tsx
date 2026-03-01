'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/lib/sidebarContext';
import {
  LayoutDashboard,
  Users,
  Shield,
  Swords,
  MessageSquare,
  Download,
  Settings,
  FileText,
  Home,
  X,
  ClipboardList,
} from 'lucide-react';

/* ── Nav item definitions ─────────────────────────────────────────── */
const superadminNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/cwl', label: 'CWL Sessions', icon: Swords },
  { href: '/dashboard/clans', label: 'Clans', icon: Shield },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/groups', label: 'Groups', icon: MessageSquare },
  { href: '/dashboard/registrations', label: 'Registrations', icon: ClipboardList },
  { href: '/dashboard/exports', label: 'Exports', icon: Download },
  { href: '/dashboard/audit', label: 'Audit Logs', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

const adminNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/cwl', label: 'CWL Sessions', icon: Swords },
  { href: '/dashboard/my-group', label: 'My Group', icon: Home },
  { href: '/dashboard/my-profile', label: 'My Profile', icon: Shield },
  { href: '/dashboard/registrations', label: 'Registrations', icon: ClipboardList },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { open, close } = useSidebar();

  const isSuperadmin = user?.roles?.includes('superadmin');
  const navItems = isSuperadmin ? superadminNav : adminNav;

  return (
    <>
      {/* Desktop sidebar — always visible lg+ */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 shadow-sm flex-col">
        <SidebarContent navItems={navItems} pathname={pathname} isSuperadmin={isSuperadmin} />
      </aside>

      {/* Mobile sidebar — slide in when open */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 shadow-xl flex flex-col lg:hidden',
          'transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent navItems={navItems} pathname={pathname} isSuperadmin={isSuperadmin} onNavClick={close} />
      </aside>
    </>
  );
}

function SidebarContent({
  navItems,
  pathname,
  isSuperadmin,
  onNavClick,
}: {
  navItems: typeof superadminNav;
  pathname: string;
  isSuperadmin?: boolean;
  onNavClick?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onNavClick}>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
            <Swords className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-base leading-none">CWL Tracker</span>
            {isSuperadmin && (
              <span className="block text-[10px] text-indigo-500 font-medium mt-0.5">Superadmin</span>
            )}
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" role="navigation" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100">
        <p className="text-[11px] text-slate-400">CWL Tracker v1.0</p>
      </div>
    </>
  );
}

