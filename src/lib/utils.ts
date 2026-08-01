import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null, fmt = 'dd MMM yyyy'): string {
  if (!date) return '—';
  return format(new Date(date), fmt, { locale: id });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return '—';
  return format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: id });
}

export function formatRelative(date: Date | string | null): string {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: id });
}

export function scoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-500';
  if (score >= 70) return 'text-blue-500';
  if (score >= 55) return 'text-amber-500';
  return 'text-red-500';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function truncate(str: string, max = 80): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    ADMIN: 'Admin', GURU: 'Guru', SISWA: 'Siswa',
  };
  return map[role] ?? role;
}

export function accountStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Menunggu Persetujuan', APPROVED: 'Disetujui', REJECTED: 'Ditolak',
  };
  return map[status] ?? status;
}

export function accountStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'text-amber-600 bg-amber-50 border-amber-200',
    APPROVED: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    REJECTED: 'text-red-600 bg-red-50 border-red-200',
  };
  return map[status] ?? 'text-slate-600 bg-slate-50 border-slate-200';
}
