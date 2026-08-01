import { TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function StatCard({ title, value, icon: Icon, description, trend, loading }: {
  title: string; value: string | number; icon: React.ComponentType<{ className?: string }>;
  description?: string; trend?: string; loading?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          {loading ? <Skeleton className="h-8 w-20" /> : (
            <p className="text-3xl font-heading font-bold text-foreground">{value}</p>
          )}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="rounded-xl bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      {trend && <p className="mt-3 text-xs text-emerald-600 font-medium flex items-center gap-1"><TrendingUp className="h-3 w-3" />{trend}</p>}
    </div>
  );
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'secondary', PUBLISHED: 'outline', ONGOING: 'default', FINISHED: 'secondary', ARCHIVED: 'secondary',
};
export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', PUBLISHED: 'Dipublikasi', ONGOING: 'Berlangsung', FINISHED: 'Selesai', ARCHIVED: 'Diarsipkan',
};

export function WelcomeBanner({ name, subtitle, action }: { name?: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-gradient-to-r from-primary to-navy-700 p-6 text-white">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-navy-100 text-sm">Selamat datang kembali,</p>
          <h1 className="text-2xl font-heading font-bold mt-0.5">{name}</h1>
          <p className="text-navy-200 text-sm mt-1">{subtitle}</p>
        </div>
        {action && <div className="hidden sm:flex items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
