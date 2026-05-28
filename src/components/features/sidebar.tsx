'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Bell,
  FilePlus,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/applications', label: 'Aplicaciones', icon: Briefcase },
  { href: '/cv', label: 'CV', icon: FileText },
  { href: '/reminders', label: 'Recordatorios', icon: Bell },
  { href: '/apply', label: 'Aplicar a oferta', icon: FilePlus },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    toast.success('Sesión cerrada');
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-gray-100', sidebarCollapsed && 'justify-center')}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-[#1D9E75] flex items-center justify-center flex-shrink-0">
            <Briefcase className="h-4 w-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-semibold text-gray-900 text-sm truncate">Job Tracker</span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              title={sidebarCollapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[#1D9E75]/10 text-[#1D9E75]'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                sidebarCollapsed && 'justify-center px-2'
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-[#1D9E75]')} />
              {!sidebarCollapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 p-2 space-y-1">
        <button
          onClick={handleLogout}
          title={sidebarCollapsed ? 'Cerrar sesión' : undefined}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors',
            sidebarCollapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!sidebarCollapsed && <span>Cerrar sesión</span>}
        </button>

        <button
          onClick={toggleSidebar}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors',
            sidebarCollapsed && 'justify-center px-2'
          )}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 flex-shrink-0" />
              <span>Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
