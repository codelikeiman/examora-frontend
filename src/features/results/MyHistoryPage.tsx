import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  History, Trophy, CheckCircle2, XCircle, Clock3, HelpCircle, Eye,
  RotateCcw, TrendingUp, ListChecks,
} from 'lucide-react';
import { useMyExamHistory } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime, cn } from '@/lib/utils';

interface HistoryRow {
  sessionId: string;
  examId: string;
  examTitle: string;
  subjectName: string | null;
  status: string;
  score: number | null;
  isPassed: boolean | null;
  passingScore: number | null;
  startedAt: string | null;
  submittedAt: string | null;
  attemptNumber: number;
  flagCount: number;
}

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'Sedang Mengerjakan',
  SUBMITTED: 'Selesai',
  AUTO_SUBMITTED: 'Selesai (Otomatis)',
  FORCE_SUBMITTED: 'Selesai (Dipaksa)',
  EXPIRED: 'Kedaluwarsa',
};

const PASS_FILTERS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'passed', label: 'Lulus' },
  { value: 'failed', label: 'Belum Lulus' },
  { value: 'pending', label: 'Menunggu Nilai' },
];

function OutcomeIcon({ row }: { row: HistoryRow }) {
  if (row.status === 'IN_PROGRESS') return <Clock3 className="h-5 w-5" />;
  if (row.isPassed === null) return <HelpCircle className="h-5 w-5" />;
  return row.isPassed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />;
}

function outcomeColor(row: HistoryRow) {
  if (row.status === 'IN_PROGRESS') return 'bg-amber-50 text-amber-600 dark:bg-amber-950/30';
  if (row.isPassed === null) return 'bg-slate-100 text-slate-500 dark:bg-slate-800/40';
  return row.isPassed ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-red-50 text-red-500 dark:bg-red-950/30';
}

export default function MyHistoryPage() {
  const { data, isLoading } = useMyExamHistory();
  const history = ((data as unknown as { data?: HistoryRow[] })?.data ?? []);

  const [subjectFilter, setSubjectFilter] = useState('all');
  const [passFilter, setPassFilter] = useState('all');

  const subjects = useMemo(() => {
    const names = new Set(history.map((h) => h.subjectName).filter((s): s is string => !!s));
    return Array.from(names).sort();
  }, [history]);

  const filtered = useMemo(() => history.filter((h) => {
    if (subjectFilter !== 'all' && h.subjectName !== subjectFilter) return false;
    if (passFilter === 'passed' && h.isPassed !== true) return false;
    if (passFilter === 'failed' && h.isPassed !== false) return false;
    if (passFilter === 'pending' && !(h.status !== 'IN_PROGRESS' && h.isPassed === null)) return false;
    return true;
  }), [history, subjectFilter, passFilter]);

  const graded = history.filter((h) => h.score !== null);
  const passedCount = graded.filter((h) => h.isPassed === true).length;
  const avgScore = graded.length > 0 ? graded.reduce((sum, h) => sum + (h.score ?? 0), 0) / graded.length : 0;
  const repeatedAttempts = history.filter((h) => h.attemptNumber > 1).length;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><History className="h-5 w-5 text-primary" />Riwayat Ujian</h1>
          <p className="text-sm text-muted-foreground">Semua percobaan ujian yang pernah Anda kerjakan</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Percobaan', value: history.length, icon: ListChecks },
          { label: 'Lulus', value: passedCount, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Rata-rata Nilai', value: graded.length > 0 ? avgScore.toFixed(1) : '—', icon: TrendingUp },
          { label: 'Ujian Diulang', value: repeatedAttempts, icon: RotateCcw },
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" />Daftar Riwayat</CardTitle>
              <CardDescription>Diurutkan dari yang paling baru dikerjakan</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Mata Pelajaran" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Mapel</SelectItem>
                  {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={passFilter} onValueChange={setPassFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status Kelulusan" /></SelectTrigger>
                <SelectContent>
                  {PASS_FILTERS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{history.length === 0 ? 'Anda belum pernah mengerjakan ujian' : 'Tidak ada riwayat yang cocok dengan filter ini'}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((row) => (
                <div key={row.sessionId} className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/20">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', outcomeColor(row))}>
                    <OutcomeIcon row={row} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{row.examTitle}</p>
                      {row.attemptNumber > 1 && (
                        <Badge variant="outline" className="text-[10px] gap-1 shrink-0"><RotateCcw className="h-3 w-3" />Percobaan ke-{row.attemptNumber}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.subjectName ?? 'Tanpa Mapel'} · {STATUS_LABELS[row.status] ?? row.status}
                      {row.submittedAt ? ` · ${formatDateTime(row.submittedAt)}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-semibold">{row.score !== null ? row.score.toFixed(1) : '—'}</p>
                    {row.passingScore !== null && (
                      <p className="text-[11px] text-muted-foreground">KKM {row.passingScore.toFixed(0)}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1.5 shrink-0" asChild>
                    <Link to={`/sessions/${row.sessionId}`}><Eye className="h-3.5 w-3.5" />Detail</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
