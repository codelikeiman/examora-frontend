import { Link } from 'react-router-dom';
import { BookOpen, ClipboardList, Plus, ArrowRight, ListChecks } from 'lucide-react';
import { useCurrentUser } from '@/stores/auth.store';
import { useExams, useQuestions } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard, STATUS_COLORS, STATUS_LABELS, WelcomeBanner, todayLabel } from './shared';

export default function GuruDashboard() {
  const user = useCurrentUser();
  const { data: examsData, isLoading: loadingExams } = useExams({ limit: 5 });
  const { data: questionsData, isLoading: loadingQuestions } = useQuestions({ limit: 1 });
  const { data: ongoingData, isLoading: loadingOngoing } = useExams({ status: 'ONGOING', limit: 5 });

  const exams = (examsData as unknown as { data?: Record<string, unknown>[] })?.data ?? [];
  const totalQuestions = (questionsData as { meta?: { total: number } })?.meta?.total ?? 0;
  const ongoingExams = (ongoingData as unknown as { data?: Record<string, unknown>[] })?.data ?? [];

  return (
    <div className="space-y-6">
      <WelcomeBanner
        name={user?.name}
        subtitle={`${todayLabel()} · Panel Guru`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0 gap-1.5" asChild>
              <Link to="/questions"><Plus className="h-4 w-4" />Buat Soal</Link>
            </Button>
            <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0 gap-1.5" asChild>
              <Link to="/exams/new"><Plus className="h-4 w-4" />Buat Ujian</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard title="Total Soal Saya" value={loadingQuestions ? '—' : totalQuestions} icon={BookOpen} description="Di bank soal" loading={loadingQuestions} />
        <StatCard title="Total Ujian" value={exams.length} icon={ClipboardList} description="Semua status" loading={loadingExams} />
        <StatCard title="Sedang Berlangsung" value={ongoingExams.length} icon={ClipboardList} description="Ujian aktif" loading={loadingOngoing} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Ujian Terbaru Saya</CardTitle>
                <CardDescription>5 ujian terakhir yang Anda buat</CardDescription>
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
                  <p className="text-sm">Belum ada ujian</p>
                  <Button variant="link" asChild className="mt-1"><Link to="/exams/new">Buat ujian pertama</Link></Button>
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
            <CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" />Akses Cepat</CardTitle>
            <CardDescription>Tugas mengajar sehari-hari</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link to="/questions"><BookOpen className="h-4 w-4" />Bank Soal</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link to="/exams/new"><Plus className="h-4 w-4" />Buat Ujian Baru</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link to="/analytics"><ClipboardList className="h-4 w-4" />Analitik & Nilai</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
