import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, ClipboardList, Clock, Trophy, ArrowRight, History } from 'lucide-react';
import { useCurrentUser } from '@/stores/auth.store';
import { useExams } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard, WelcomeBanner, todayLabel } from './shared';

export default function SiswaDashboard() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { data: ongoingData, isLoading: loadingOngoing } = useExams({ status: 'ONGOING', limit: 10 });
  const { data: publishedData, isLoading: loadingPublished } = useExams({ status: 'PUBLISHED', limit: 5 });
  const { data: finishedData, isLoading: loadingFinished } = useExams({ status: 'FINISHED', limit: 5 });

  const ongoingExams = (ongoingData as unknown as { data?: Record<string, unknown>[] })?.data ?? [];
  const upcomingExams = (publishedData as unknown as { data?: Record<string, unknown>[] })?.data ?? [];
  const finishedExams = (finishedData as unknown as { data?: Record<string, unknown>[] })?.data ?? [];

  return (
    <div className="space-y-6">
      <WelcomeBanner name={user?.name} subtitle={`${todayLabel()} · Semangat belajar!`} />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard title="Ujian Aktif" value={ongoingExams.length} icon={ClipboardList} description="Bisa dikerjakan sekarang" loading={loadingOngoing} />
        <StatCard title="Akan Datang" value={upcomingExams.length} icon={Clock} description="Belum dimulai" loading={loadingPublished} />
        <StatCard title="Selesai" value={finishedExams.length} icon={Trophy} description="Sudah dikerjakan" loading={loadingFinished} />
      </div>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5"><History className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="font-medium">Riwayat Ujian</p>
              <p className="text-sm text-muted-foreground">Lihat semua nilai dan percobaan ujian Anda</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-1">
            <Link to="/my-history">Buka <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Ujian yang Bisa Dikerjakan</CardTitle>
            <CardDescription>Ujian yang sedang berlangsung untuk kelas Anda</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-primary">
            <Link to="/my-exams">Lihat Semua <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loadingOngoing ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : ongoingExams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Belum ada ujian yang bisa dikerjakan saat ini</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {ongoingExams.map((exam) => (
                <div key={exam.id as string} className="flex items-center gap-4 rounded-xl border bg-card p-4">
                  <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{exam.title as string}</p>
                    <p className="text-sm text-muted-foreground">{exam.subjectName as string} · {exam.durationMinutes as number} menit</p>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/exam/${exam.id as string}/take`)}>Mulai Ujian</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
