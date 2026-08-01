import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BookOpen, BarChart3, Bell, ChevronDown, ClipboardList,
  GraduationCap, History, LayoutDashboard, LogOut,
  School, Settings, ShieldCheck, Users, FileText, ChevronLeft, ChevronRight,
  Menu, X,
} from 'lucide-react';
import { useAuthStore, useCurrentUser } from '@/stores/auth.store';
import { useLogout, usePendingUserCount } from '@/lib/queries';
import { useUnreadCount } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  badge?: number;
}

// 3-role model: ADMIN, GURU, SISWA.
// Bank Soal & Ujian (authoring) are GURU-only — ADMIN cannot create exam questions.
// ADMIN keeps oversight via Analitik/Pengguna/Sekolah & Kelas.
const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Bank Soal', href: '/questions', icon: BookOpen, roles: ['GURU'] },
  { label: 'Ujian', href: '/exams', icon: ClipboardList, roles: ['ADMIN', 'GURU'] },
  { label: 'Ujian Saya', href: '/my-exams', icon: GraduationCap, roles: ['SISWA'] },
  { label: 'Riwayat Ujian', href: '/my-history', icon: History, roles: ['SISWA'] },
  { label: 'Analitik', href: '/analytics', icon: BarChart3, roles: ['ADMIN', 'GURU'] },
  { label: 'Pengguna', href: '/users', icon: Users, roles: ['ADMIN'] },
  { label: 'Sekolah & Kelas', href: '/master', icon: School, roles: ['ADMIN'] },
  { label: 'Audit Log', href: '/audit', icon: ShieldCheck, roles: ['ADMIN'] },
];

export default function MainLayout() {
  const user = useCurrentUser();
  const { data: unreadData } = useUnreadCount();
  const { data: pendingData } = usePendingUserCount();
  const logoutMutation = useLogout();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const unreadCount = (unreadData as unknown as { data?: { count: number } })?.data?.count ?? 0;
  const pendingCount = (pendingData as unknown as { data?: { count: number } })?.data?.count ?? 0;

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate('/login');
  };

  const userInitials = user?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U';
  const visibleNav = navItems
    .filter((item) => !item.roles || item.roles.includes(user?.role ?? ''))
    .map((item) => (item.href === '/users' && user?.role === 'ADMIN' ? { ...item, badge: pendingCount } : item));

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b', collapsed && 'justify-center px-2')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white font-heading font-bold text-base">E</div>
        {!collapsed && (
          <div>
            <p className="font-heading font-semibold text-sm leading-tight text-foreground">Examora CBT</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Enterprise Edition</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 relative',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center px-2',
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate flex-1">{item.label}</span>}
            {!!item.badge && (
              <Badge variant="destructive" className={cn('h-5 min-w-5 justify-center px-1 text-[10px]', collapsed && 'absolute top-1 right-1')}>
                {item.badge}
              </Badge>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle (desktop) */}
      <div className="border-t px-2 py-2 hidden lg:block">
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="w-full justify-center">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className={cn('hidden lg:flex flex-col border-r bg-card transition-all duration-300', collapsed ? 'w-[60px]' : 'w-[220px]')}>
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[220px] bg-card border-r shadow-xl z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4 shrink-0">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          {/* Notification Bell */}
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link to="/notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]" variant="destructive">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Link>
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{userInitials}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block text-sm font-medium max-w-[120px] truncate">{user?.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile"><Settings className="mr-2 h-4 w-4" /> Profil & Pengaturan</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
