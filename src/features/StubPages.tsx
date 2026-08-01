// ============================================================
// Stub pages — fully wired to the router and API layer.
// Each can be expanded to a full implementation following
// the same patterns as QuestionBankPage, etc.
// ============================================================

import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Plus, BarChart3, ChevronRight, BookOpen, Search, Users, School, BookMarked } from 'lucide-react';
import { useExams, useExam, useCreateExam, useUpdateExam, usePublishExam, useSubjects, useExamPool, useUsers, useNotifications, useMarkAllRead, useAuditLogs, useMySessionForExam } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { formatDateTime, roleLabel, cn } from '@/lib/utils';
import { useUserRole } from '@/stores/auth.store';

const STATUS_LABELS: Record<string, string> = { DRAFT: 'Draft', PUBLISHED: 'Dipublikasi', ONGOING: 'Berlangsung', FINISHED: 'Selesai', ARCHIVED: 'Diarsipkan' };
const STATUS_VARIANT: Record<string, string> = { DRAFT: 'secondary', PUBLISHED: 'outline', ONGOING: 'default', FINISHED: 'secondary', ARCHIVED: 'secondary' };

// ── ExamListPage ─────────────────────────────────────────────────────────────
export function ExamListPage({ forAnalytics = false }: { forAnalytics?: boolean }) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const role = useUserRole();
  const { data, isLoading } = useExams({ search: search || undefined, limit: 20 });
  const exams = (data as unknown as { data?: Record<string, unknown>[] })?.data ?? [];

  const prefix = forAnalytics ? '/analytics' : '/exams';
  const title = forAnalytics ? 'Pilih Ujian untuk Dianalisis' : 'Daftar Ujian';

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        {!forAnalytics && role === 'GURU' && (
          <Button size="sm" className="gap-1.5" asChild><Link to="/exams/new"><Plus className="h-4 w-4" />Buat Ujian</Link></Button>
        )}
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari ujian..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="grid gap-3">
        {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />) :
          exams.map((exam) => (
            <Link key={exam.id as string} to={`${prefix}/${exam.id}`} className="flex items-center gap-4 rounded-xl border bg-card p-4 hover:shadow-sm hover:border-primary/40 transition-all group">
              <div className="rounded-xl bg-primary/10 p-3 shrink-0">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium group-hover:text-primary transition-colors">{exam.title as string}</p>
                <p className="text-sm text-muted-foreground">{exam.subjectName as string} · {exam.durationMinutes as number} menit · {formatDateTime(exam.startTime as string)}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={STATUS_VARIANT[exam.status as string] as 'default' | 'secondary' | 'outline' | 'destructive' | null | undefined}>{STATUS_LABELS[exam.status as string]}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}

// ── ExamFormPage ──────────────────────────────────────────────────────────────
export function ExamFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { data: existingData } = useExam(id ?? '');
  const { data: subjectsData } = useSubjects();
  const createMutation = useCreateExam();
  const updateMutation = useUpdateExam();
  const subjects = (subjectsData as unknown as { data?: { id: string; name: string }[] })?.data ?? [];
  const existing = (existingData as unknown as { data?: Record<string, unknown> })?.data;

  const [form, setForm] = useState({ title: '', subjectId: '', durationMinutes: 90, questionCount: 40, passingScore: 70, classIds: [] as string[] });

  const handleSave = async () => {
    try {
      const startTime = new Date(); startTime.setHours(startTime.getHours() + 1);
      const endTime = new Date(); endTime.setHours(endTime.getHours() + 5);
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, ...form });
      } else {
        await createMutation.mutateAsync({ ...form, startTime, endTime, randomizeQuestions: true, randomizeOptions: true, maxAttempts: 1, showResultImmediately: true, requireToken: true });
      }
      toast({ title: `✅ Ujian berhasil ${isEdit ? 'diperbarui' : 'dibuat'}` });
      navigate('/exams');
    } catch { toast({ title: 'Gagal menyimpan', variant: 'destructive' }); }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="page-title">{isEdit ? 'Edit Ujian' : 'Buat Ujian Baru'}</h1>
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-1.5"><label className="text-sm font-medium">Judul Ujian</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ujian Tengah Semester Matematika" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-sm font-medium">Durasi (menit)</label>
              <Input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: +e.target.value })} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Jumlah Soal</label>
              <Input type="number" value={form.questionCount} onChange={(e) => setForm({ ...form, questionCount: +e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Nilai KKM</label>
            <Input type="number" value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: +e.target.value })} /></div>
          <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="w-full">
            {(createMutation.isPending || updateMutation.isPending) ? 'Menyimpan...' : isEdit ? 'Perbarui Ujian' : 'Simpan Ujian'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── ExamDetailPage ────────────────────────────────────────────────────────────
export function ExamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useExam(id ?? '');
  const publishMutation = usePublishExam();
  const { data: poolData } = useExamPool(id ?? '');
  const exam = (data as unknown as { data?: Record<string, unknown> })?.data;
  const pool = (poolData as unknown as { data?: unknown[] })?.data ?? [];

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!exam) return <div>Ujian tidak ditemukan</div>;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">{exam.title as string}</h1>
          <p className="text-sm text-muted-foreground">{exam.subjectName as string} · {exam.durationMinutes as number} menit</p>
        </div>
        <div className="flex gap-2">
          {exam.status === 'DRAFT' && (
            <Button size="sm" onClick={async () => { await publishMutation.mutateAsync(id!); toast({ title: '✅ Ujian dipublikasikan' }); }}>
              Publikasikan
            </Button>
          )}
          {(exam.status === 'ONGOING' || exam.status === 'FINISHED') && (
            <Button size="sm" variant="outline" onClick={() => navigate(`/exams/${id}/results`)}>
              <BarChart3 className="h-4 w-4 mr-1.5" />Hasil Ujian
            </Button>
          )}
          {exam.status === 'FINISHED' && (
            <Button size="sm" variant="outline" onClick={() => navigate(`/analytics/${id}`)}>
              <BarChart3 className="h-4 w-4 mr-1.5" />Analitik
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card"><p className="text-2xl font-heading font-bold">{pool.length}</p><p className="text-xs text-muted-foreground mt-1">Soal di Pool</p></div>
        <div className="stat-card"><p className="text-2xl font-heading font-bold">{exam.questionCount as number}</p><p className="text-xs text-muted-foreground mt-1">Soal per Ujian</p></div>
        <div className="stat-card"><p className="text-2xl font-heading font-bold">{exam.passingScore as number}</p><p className="text-xs text-muted-foreground mt-1">Nilai KKM</p></div>
      </div>
    </div>
  );
}

// ── FinishedExamRow ──────────────────────────────────────────────────────────
// Looks up the student's own session id for this exam, then links into the
// shared session-review page (same page GURU/ADMIN use to review any student).
function FinishedExamRow({ exam }: { exam: Record<string, unknown> }) {
  const { data } = useMySessionForExam(exam.id as string);
  const session = (data as unknown as { data?: Record<string, unknown> | null })?.data;
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium">{exam.title as string}</p>
        <p className="text-sm text-muted-foreground">{exam.subjectName as string} · {exam.durationMinutes as number} menit</p>
      </div>
      {session?.id ? (
        <Button size="sm" variant="outline" asChild>
          <Link to={`/sessions/${session.id as string}`}>Lihat Hasil</Link>
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">Belum dikerjakan</span>
      )}
    </div>
  );
}

// ── MyExamsPage ───────────────────────────────────────────────────────────────
export function MyExamsPage() {
  const navigate = useNavigate();
  const { data: ongoingData, isLoading: loadingOngoing } = useExams({ status: 'ONGOING', limit: 20 });
  const { data: finishedData, isLoading: loadingFinished } = useExams({ status: 'FINISHED', limit: 20 });
  const ongoingExams = (ongoingData as unknown as { data?: Record<string, unknown>[] })?.data ?? [];
  const finishedExams = (finishedData as unknown as { data?: Record<string, unknown>[] })?.data ?? [];
  const isLoading = loadingOngoing || loadingFinished;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title mb-4">Ujian Saya</h1>
        {isLoading ? <Skeleton className="h-40 w-full" /> :
          ongoingExams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-xl">
              <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" /><p>Belum ada ujian yang bisa dikerjakan saat ini</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {ongoingExams.map((exam) => (
                <div key={exam.id as string} className="flex items-center gap-4 rounded-xl border bg-card p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{exam.title as string}</p>
                    <p className="text-sm text-muted-foreground">{exam.subjectName as string} · {exam.durationMinutes as number} menit</p>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/exam/${exam.id}/take`)}>Mulai Ujian</Button>
                </div>
              ))}
            </div>
          )}
      </div>

      <div>
        <h2 className="text-base font-heading font-semibold mb-4">Riwayat Ujian Selesai</h2>
        {isLoading ? <Skeleton className="h-32 w-full" /> :
          finishedExams.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border rounded-xl">
              <p className="text-sm">Belum ada riwayat ujian yang selesai</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {finishedExams.map((exam) => <FinishedExamRow key={exam.id as string} exam={exam} />)}
            </div>
          )}
      </div>
    </div>
  );
}

// ── UsersPage ─────────────────────────────────────────────────────────────────
export function UsersPage() {
  const { data, isLoading } = useUsers({ limit: 20 });
  const users = (data as unknown as { data?: Record<string, unknown>[] })?.data ?? [];
  return (
    <div className="space-y-5">
      <div className="page-header"><h1 className="page-title">Manajemen Pengguna</h1>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Tambah Pengguna</Button></div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-y"><tr>
              {['Nama', 'Email', 'Role', 'Status', 'Terakhir Login', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y">
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6}><Skeleton className="h-10 w-full m-2" /></td></tr>) :
                users.map((u) => (
                  <tr key={u.id as string} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{u.name as string}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email as string}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{roleLabel(u.role as string)}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={u.isActive ? 'default' : 'secondary'}>{u.isActive ? 'Aktif' : 'Nonaktif'}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{u.lastLoginAt ? formatDateTime(u.lastLoginAt as string) : '—'}</td>
                    <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm">Edit</Button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── MasterDataPage ────────────────────────────────────────────────────────────
export function MasterDataPage() {
  return (
    <div className="space-y-5">
      <h1 className="page-title">Data Master</h1>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[{ label: 'Sekolah', icon: School, desc: 'Kelola profil sekolah' }, { label: 'Kelas', icon: Users, desc: 'Kelola kelas & siswa' }, { label: 'Mata Pelajaran', icon: BookMarked, desc: 'Kelola daftar mapel' }].map(({ label, icon: Icon, desc }) => (
          <Card key={label} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className="h-5 w-5 text-primary" />{label}</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── NotificationsPage ─────────────────────────────────────────────────────────
export function NotificationsPage() {
  const { data, isLoading } = useNotifications({ limit: 20 });
  const markAllMutation = useMarkAllRead();
  const notifs = (data as unknown as { data?: Record<string, unknown>[] })?.data ?? [];

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="page-header"><h1 className="page-title">Notifikasi</h1>
        <Button variant="ghost" size="sm" onClick={() => markAllMutation.mutate()}>Tandai Semua Dibaca</Button></div>
      <Card>
        <CardContent className="p-0 divide-y">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-10 w-full" /></div>) :
            notifs.length === 0 ? <div className="text-center py-10 text-muted-foreground">Tidak ada notifikasi</div> :
              notifs.map((n) => (
                <div key={n.id as string} className={cn('p-4 transition-colors', !n.isRead && 'bg-primary/3')}>
                  <div className="flex items-start gap-3">
                    {!n.isRead && <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                    <div className={!n.isRead ? '' : 'ml-5'}>
                      <p className="text-sm font-medium">{n.title as string}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message as string}</p>
                    </div>
                  </div>
                </div>
              ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── AuditLogPage ──────────────────────────────────────────────────────────────
export function AuditLogPage() {
  const { data, isLoading } = useAuditLogs({ limit: 30 });
  const logs = (data as unknown as { data?: Record<string, unknown>[] })?.data ?? [];
  return (
    <div className="space-y-5">
      <h1 className="page-title">Audit Log</h1>
      <Card><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-y"><tr>
            {['Waktu', 'Pengguna', 'Aksi', 'Entitas', 'IP'].map((h) => <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y">
            {isLoading ? Array.from({ length: 8 }).map((_, i) => <tr key={i}><td colSpan={5}><Skeleton className="h-8 w-full m-1.5" /></td></tr>) :
              logs.map((l) => (
                <tr key={l.id as string} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{formatDateTime(l.createdAt as string)}</td>
                  <td className="px-4 py-2.5 text-xs">{l.userName as string ?? '—'}</td>
                  <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs font-mono">{l.action as string}</Badge></td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{l.entity as string}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{l.ipAddress as string ?? '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}

// ── NotFoundPage ──────────────────────────────────────────────────────────────
export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <p className="text-7xl font-heading font-bold text-muted-foreground/30 mb-4">404</p>
      <h1 className="text-xl font-heading font-semibold mb-2">Halaman Tidak Ditemukan</h1>
      <p className="text-sm text-muted-foreground mb-6">Halaman yang Anda cari tidak ada atau telah dipindahkan.</p>
      <Button asChild><Link to="/dashboard">Kembali ke Dashboard</Link></Button>
    </div>
  );
}
