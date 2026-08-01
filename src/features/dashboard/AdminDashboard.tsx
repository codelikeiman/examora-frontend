import { Link } from 'react-router-dom';
import { Users, GraduationCap, ClipboardList, School, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';
import { useCurrentUser } from '@/stores/auth.store';
import { useRoleCounts, useExams, usePendingUserCount } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard, STATUS_COLORS, STATUS_LABELS, WelcomeBanner, todayLabel } from './shared';

export default function AdminDashboard() {
  const user = useCurrentUser();
  const { data: roleCountsData, isLoading: loadingCounts } = useRoleCounts();
  const { data: examsData, isLoading: loadingExams } = useExams({ limit: 5 });
  const { data: pendingData, isLoading: loadingPending } = usePendingUserCount();

  const roleCounts = (roleCountsData as unknown as { data?: Record<string, number> })?.data ?? {};
  const exams = (examsData as unknown as { data?: Record<string, unknown>[] })?.data ?? [];
  const pendingCount = (pendingData as unknown as { data?: { count: number } })?.data?.count ?? 0;

  return (
    <div className="space-y-6">
      <WelcomeBanner
        name={user?.name}
        subtitle={`${todayLabel()} · Panel Administrator`}
        action={
          <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0 gap-1.5" asChild>
            <Link to="/users"><Users className="h-4 w-4" />Kelola Pengguna</Link>
          </Button>
        }
      />

      {pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2">
                <UserCheck className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {pendingCount} akun menunggu persetujuan
                </p>
                <p className="text-xs text-amber-700">Pendaftaran guru/siswa baru perlu ditinjau sebelum bisa masuk.</p>
              </div>
            </div>
            <Button size="sm" asChild>
              <Link to="/users">Tinjau Sekarang</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Siswa" value={roleCounts?.SISWA ?? '—'} icon={GraduationCap} description="Akun aktif" loading={loadingCounts} />
        <StatCard title="Total Guru" value={roleCounts?.GURU ?? '—'} icon={Users} description="Akun aktif" loading={loadingCounts} />
        <StatCard title="Total Ujian" value={exams.length} icon={ClipboardList} description="Semua status" loading={loadingExams} />
        <StatCard title="Menunggu Persetujuan" value={loadingPending ? '—' : pendingCount} icon={UserCheck} description="Akun baru" loading={loadingPending} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Ujian Terbaru</CardTitle>
                <CardDescription>Dipantau dari seluruh guru pengampu</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="gap-1 text-primary">
                <Link to="/exams">Lihat Semua <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loadingExams ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : exams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Belum ada ujian dibuat oleh guru</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {exams.map((exam) => (
                    <Link key={exam.id as string} to={`/exams/${exam.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors group">
                      <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                        <ClipboardList className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary">{exam.title as string}</p>
                        <p className="text-xs text-muted-foreground">{exam.subjectName as string} · {exam.durationMinutes as number} menit</p>
                      </div>
                      <Badge variant={STATUS_COLORS[exam.status as string] as 'default' | 'secondary' | 'outline' | 'destructive' | null | undefined}>
                        {STATUS_LABELS[exam.status as string] ?? exam.status as string}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Akses Cepat</CardTitle>
            <CardDescription>Tugas administratif utama</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link to="/users"><UserCheck className="h-4 w-4" />Persetujuan Akun {pendingCount > 0 && <Badge variant="destructive" className="ml-auto">{pendingCount}</Badge>}</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link to="/master"><School className="h-4 w-4" />Sekolah & Kelas</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link to="/analytics"><ClipboardList className="h-4 w-4" />Analitik Nilai</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        Catatan: sebagai Admin, Anda tidak dapat membuat soal atau ujian — pembuatan soal ujian merupakan
        wewenang akun Guru. Admin berperan mengelola pengguna, persetujuan akun, data sekolah/kelas, serta
        memantau pelaksanaan ujian.
      </div>
    </div>
  );
}
