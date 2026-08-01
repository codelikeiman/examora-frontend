import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, XCircle, HelpCircle, Trophy, Clock3 } from 'lucide-react';
import { useSessionDetail } from '@/lib/queries';
import { useCurrentUser } from '@/stores/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDateTime } from '@/lib/utils';

interface ReviewItem {
  examQuestionId: string;
  questionNo: number;
  type: string;
  content: string;
  imageUrl: string | null;
  points: number;
  options: Array<{ id: string; content: string; isCorrect: boolean }>;
  selectedOptions: string[] | null;
  essayAnswer: string | null;
  isCorrect: boolean | null;
  pointsEarned: number | null;
  explanation: string | null;
}

interface SessionDetailResponse {
  session: {
    id: string;
    examId: string;
    studentId: string;
    status: string;
    score: number | null;
    isPassed: boolean | null;
    submittedAt: string | null;
    attemptNumber: number;
  };
  review: ReviewItem[];
}

export default function SessionReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { data, isLoading, error } = useSessionDetail(sessionId ?? '');
  const result = (data as unknown as { data?: SessionDetailResponse })?.data;

  const isStaff = user?.role === 'ADMIN' || user?.role === 'GURU';
  const backHref = isStaff ? -1 : '/my-exams';

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Sesi tidak ditemukan atau Anda tidak memiliki akses untuk melihatnya.</p>
        <Button variant="link" onClick={() => navigate(-1)}>Kembali</Button>
      </div>
    );
  }

  const { session, review } = result;
  const pendingGrading = session.isPassed === null;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => (typeof backHref === 'string' ? navigate(backHref) : navigate(-1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="page-title">Detail Jawaban Ujian</h1>
          <p className="text-sm text-muted-foreground">
            Percobaan ke-{session.attemptNumber} · {session.submittedAt ? formatDateTime(session.submittedAt) : 'Belum dikumpulkan'}
          </p>
        </div>
      </div>

      {/* Score summary */}
      <Card>
        <CardContent className="py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-full',
                pendingGrading ? 'bg-amber-50 text-amber-600' : session.isPassed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
                {pendingGrading ? <HelpCircle className="h-6 w-6" /> : session.isPassed ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
              </div>
              <div>
                <p className="text-2xl font-heading font-bold">{session.score !== null ? session.score.toFixed(1) : '—'}</p>
                <p className="text-xs text-muted-foreground">
                  {pendingGrading ? 'Menunggu penilaian esai' : session.isPassed ? 'Lulus' : 'Belum Lulus'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5"><Trophy className="h-3.5 w-3.5" />{review.length} soal</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Per-question review */}
      <div className="space-y-4">
        {review.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-xl">
            <Clock3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Jawaban belum bisa ditampilkan — sesi masih berlangsung.</p>
          </div>
        ) : review.map((item) => (
          <Card key={item.examQuestionId}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-sm flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-mono text-xs font-bold">
                    {item.questionNo}
                  </span>
                  <span className="font-normal leading-relaxed whitespace-pre-wrap">{item.content}</span>
                </CardTitle>
                {item.isCorrect !== null && (
                  <Badge variant={item.isCorrect ? 'default' : 'destructive'} className="shrink-0 gap-1">
                    {item.isCorrect ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {item.pointsEarned ?? 0}/{item.points}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-1">
              {item.type !== 'ESSAY' ? (
                item.options.map((opt, i) => {
                  const isSelected = item.selectedOptions?.includes(opt.id) ?? false;
                  return (
                    <div
                      key={opt.id}
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg border p-2.5 text-sm',
                        opt.isCorrect ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20' :
                          isSelected ? 'border-red-300 bg-red-50/60 dark:bg-red-950/20' : 'border-border',
                      )}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{opt.content}</span>
                      {opt.isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                      {!opt.isCorrect && isSelected && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                  {item.essayAnswer || <span className="text-muted-foreground italic">Tidak dijawab</span>}
                </div>
              )}
              {item.explanation && (
                <p className="text-xs text-muted-foreground pt-1 border-t mt-2 pt-2">
                  <strong>Pembahasan:</strong> {item.explanation}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
