import { useParams, Link } from 'react-router-dom';
import { Trophy, Medal, ChevronLeft, Users, CheckCircle2, XCircle, Clock3, Eye } from 'lucide-react';
import { useExam, useExamResults } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, cn } from '@/lib/utils';

interface ResultRow {
  sessionId: string;
  studentId: string;
  studentName: string;
  studentUsername: string;
  className: string | null;
  status: string;
  score: number | null;
  isPassed: boolean | null;
  submittedAt: string | null;
  attemptNumber: number;
  rank: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Belum Mulai', IN_PROGRESS: 'Sedang Mengerjakan', SUBMITTED: 'Selesai',
  AUTO_SUBMITTED: 'Selesai (Otomatis)', FORCE_SUBMITTED: 'Selesai (Dipaksa)', EXPIRED: 'Kedaluwarsa',
};

function RankBadge({ rank }: { rank: number | null }) {
  if (!rank) return <span className="text-xs text-muted-foreground">—</span>;
  if (rank === 1) return <span className="inline-flex items-center gap-1 text-amber-500 font-bold"><Trophy className="h-4 w-4" />1</span>;
  if (rank === 2) return <span className="inline-flex items-center gap-1 text-slate-400 font-bold"><Medal className="h-4 w-4" />2</span>;
  if (rank === 3) return <span className="inline-flex items-center gap-1 text-amber-700 font-bold"><Medal className="h-4 w-4" />3</span>;
  return <span className="font-mono text-sm text-muted-foreground">{rank}</span>;
}

export default function ExamResultsPage() {
  const { examId } = useParams<{ examId: string }>();
  const { data: examData } = useExam(examId ?? '');
  const { data: resultsData, isLoading } = useExamResults(examId ?? '');
  const exam = (examData as unknown as { data?: Record<string, unknown> })?.data;
  const results = ((resultsData as unknown as { data?: ResultRow[] })?.data ?? []);

  const graded = results.filter((r) => r.score !== null);
  const passedCount = graded.filter((r) => r.isPassed === true).length;
  const avgScore = graded.length > 0 ? graded.reduce((sum, r) => sum + (r.score ?? 0), 0) / graded.length : 0;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to={`/exams/${examId}`}><ChevronLeft className="h-5 w-5" /></Link></Button>
          <div>
            <h1 className="page-title">Hasil Ujian & Ranking</h1>
            <p className="text-sm text-muted-foreground">{exam?.title as string ?? 'Memuat ujian...'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Peserta', value: results.length, icon: Users },
          { label: 'Sudah Dinilai', value: graded.length, icon: CheckCircle2 },
          { label: 'Lulus', value: passedCount, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Rata-rata', value: avgScore.toFixed(1), icon: Trophy },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn('text-2xl font-heading font-bold', color)}>{value}</p>
              </div>
              <Icon className={cn('h-5 w-5', color ?? 'text-primary')} />
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" />Papan Peringkat</CardTitle>
          <CardDescription>Diurutkan dari nilai tertinggi ke terendah</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Belum ada siswa yang mengerjakan ujian ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-y">
                  <tr>
                    {['Peringkat', 'Nama Siswa', 'Kelas', 'Status', 'Nilai', 'Kelulusan', 'Waktu Kumpul', ''].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {results.map((r) => (
                    <tr key={r.sessionId} className={cn('hover:bg-muted/20', r.rank === 1 && 'bg-amber-50/50 dark:bg-amber-950/10')}>
                      <td className="px-4 py-2.5"><RankBadge rank={r.rank} /></td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{r.studentName}</p>
                        <p className="text-xs text-muted-foreground">@{r.studentUsername}</p>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.className ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-xs gap-1">
                          {r.status === 'IN_PROGRESS' && <Clock3 className="h-3 w-3" />}
                          {STATUS_LABELS[r.status] ?? r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold">{r.score !== null ? r.score.toFixed(1) : '—'}</td>
                      <td className="px-4 py-2.5">
                        {r.isPassed === null ? (
                          <span className="text-xs text-muted-foreground">Menunggu Nilai</span>
                        ) : r.isPassed ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle2 className="h-3.5 w-3.5" />Lulus</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium"><XCircle className="h-3.5 w-3.5" />Belum Lulus</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.submittedAt ? formatDateTime(r.submittedAt) : '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                          <Link to={`/sessions/${r.sessionId}`}><Eye className="h-3.5 w-3.5" />Detail Jawaban</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
