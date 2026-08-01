import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, HelpCircle, Trophy, ArrowLeft, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ExamResultPanelProps {
  score: number;
  isPassed: boolean | null; // null = essay present, awaiting manual grading
  examTitle: string;
  sessionId: string | null;
}

/**
 * Shown right after a student submits (or the timer auto-submits) an exam.
 * `isPassed === null` means the exam contains essay questions that still
 * need manual grading by a guru, so we can't show pass/fail yet — only the
 * objective-question score collected so far.
 */
export default function ExamResultPanel({ score, isPassed, examTitle, sessionId }: ExamResultPanelProps) {
  const pendingGrading = isPassed === null;

  const statusConfig = pendingGrading
    ? { icon: HelpCircle, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200', label: 'Menunggu Penilaian' }
    : isPassed
      ? { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200', label: 'Lulus' }
      : { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-200', label: 'Belum Lulus' };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardContent className="pt-10 pb-8 text-center space-y-6">
          <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${statusConfig.bg} ring-8 ${statusConfig.ring}`}>
            <StatusIcon className={`h-10 w-10 ${statusConfig.color}`} />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Ujian selesai dikumpulkan</p>
            <h1 className="text-xl font-heading font-bold">{examTitle}</h1>
          </div>

          <div className="rounded-2xl bg-muted/40 p-6 space-y-2">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Trophy className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Skor Anda</span>
            </div>
            <p className="text-5xl font-heading font-bold tabular-nums">
              {pendingGrading ? score.toFixed(1) : score.toFixed(1)}
            </p>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
            {pendingGrading && (
              <p className="text-xs text-muted-foreground pt-1">
                Skor di atas hanya dari soal pilihan ganda. Ujian ini memiliki soal esai yang perlu
                dinilai manual oleh guru — skor akhir & status kelulusan akan diperbarui setelah dinilai.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {sessionId && (
              <Button asChild variant="outline" className="w-full gap-2">
                <Link to={`/sessions/${sessionId}`}><ListChecks className="h-4 w-4" />Lihat Detail Jawaban</Link>
              </Button>
            )}
            <Button asChild className="w-full gap-2">
              <Link to="/my-exams"><ArrowLeft className="h-4 w-4" />Kembali ke Ujian Saya</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
