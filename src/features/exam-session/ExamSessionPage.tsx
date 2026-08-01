import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, BookmarkCheck, ChevronLeft, ChevronRight, Clock, Flag, Send } from 'lucide-react';
import { useStartSession, useSaveAnswer, useSubmitSession } from '@/lib/queries';
import { useExamSessionStore, useAnsweredCount, useDoubtfulCount } from '@/stores/exam-session.store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import TokenEntryDialog from './TokenEntryDialog';
import ExamResultPanel from './ExamResultPanel';

// ── Timer hook ───────────────────────────────────────────────────────────────
function useCountdown(startedAt: Date | null, durationMinutes: number) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!startedAt) return;
    const endMs = new Date(startedAt).getTime() + durationMinutes * 60_000;
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((endMs - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, durationMinutes]);
  return secondsLeft;
}

function TimerDisplay({ seconds }: { seconds: number | null }) {
  if (seconds === null) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const colorClass = seconds < 300 ? 'timer-danger' : seconds < 600 ? 'timer-warning' : 'timer-ok';
  const pct = Math.max(0, Math.min(100, (seconds / 3600) * 100)); // rough - pass max in real code

  return (
    <div className={cn('flex items-center gap-2 font-mono font-medium text-lg', colorClass)}>
      <Clock className="h-5 w-5 shrink-0" />
      <span>{h > 0 ? `${h}:` : ''}{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ExamSessionPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const store = useExamSessionStore();
  const answeredCount = useAnsweredCount();
  const doubtfulCount = useDoubtfulCount();
  const secondsLeft = useCountdown(store.startedAt, store.durationMinutes);

  const startSession = useStartSession(examId!);
  const saveAnswer = useSaveAnswer(store.sessionId ?? '');
  const submitMutation = useSubmitSession();

  const [sessionData, setSessionData] = useState<Record<string, unknown>[]>([]);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | undefined>();
  const [isStarting, setIsStarting] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Bootstrap session ─────────────────────────────────────────────────────
  const doStart = useCallback(async (token?: string) => {
    setIsStarting(true);
    try {
      const res = await startSession.mutateAsync({ token });
      const data = (res as unknown as { data?: Record<string, unknown> })?.data;
      if (!data) throw new Error('No session data');

      const session = data.session as Record<string, unknown>;
      const questionOrder = data.questionOrder as string[];
      const examData = data.exam as Record<string, unknown> | undefined;

      store.initSession({
        sessionId: session.id as string,
        examId: examId!,
        examTitle: (examData?.title ?? 'Ujian') as string,
        durationMinutes: (examData?.durationMinutes ?? 60) as number,
        startedAt: session.startedAt ? new Date(session.startedAt as string) : new Date(),
        questionOrder,
      });

      // Load question content from the questions embedded in pool
      const questions = data.questions as Record<string, unknown>[];
      if (questions) setSessionData(questions);

    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? '';
      if (msg.toLowerCase().includes('token')) {
        setShowTokenDialog(true);
      } else {
        toast({ title: 'Gagal memulai sesi', description: msg, variant: 'destructive' });
        navigate('/my-exams');
      }
    } finally {
      setIsStarting(false);
    }
  }, [examId, startSession, store, navigate]);

  useEffect(() => {
    if (!store.isSubmitted) doStart();
    return () => { store.reset(); };
  }, []); // eslint-disable-line

  // ── Auto-submit when time runs out ────────────────────────────────────────
  useEffect(() => {
    if (secondsLeft === 0 && !store.isSubmitted && store.sessionId) {
      handleSubmit();
    }
  }, [secondsLeft]); // eslint-disable-line

  // ── Debounced auto-save ───────────────────────────────────────────────────
  const triggerAutoSave = useCallback((examQuestionId: string, data: { selectedOptions?: string[]; essayAnswer?: string; isDoubtful?: boolean }) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!store.sessionId) return;
      try {
        await saveAnswer.mutateAsync({ examQuestionId, ...data });
      } catch { /* silent fail - store is source of truth */ }
    }, 800);
  }, [store.sessionId, saveAnswer]);

  const currentEqId = store.questionOrder[store.currentIndex];
  const currentQuestion = sessionData.find((q) => (q.examQuestionId ?? q.id) === currentEqId) as Record<string, unknown> | undefined;
  const currentAnswer = store.answers[currentEqId ?? ''];

  const handleOptionSelect = (optionId: string, isMultiAnswer: boolean) => {
    if (!currentEqId) return;
    let newSelected: string[];
    if (isMultiAnswer) {
      const prev = currentAnswer?.selectedOptions ?? [];
      newSelected = prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId];
    } else {
      newSelected = [optionId];
    }
    store.setAnswer(currentEqId, { selectedOptions: newSelected });
    triggerAutoSave(currentEqId, { selectedOptions: newSelected, isDoubtful: currentAnswer?.isDoubtful ?? false });
  };

  const handleEssayChange = (text: string) => {
    if (!currentEqId) return;
    store.setAnswer(currentEqId, { essayAnswer: text });
    triggerAutoSave(currentEqId, { essayAnswer: text });
  };

  const handleDoubtful = () => {
    if (!currentEqId) return;
    store.toggleDoubtful(currentEqId);
    triggerAutoSave(currentEqId, { isDoubtful: !currentAnswer?.isDoubtful });
  };

  const handleSubmit = async () => {
    if (!store.sessionId) return;
    try {
      const res = await submitMutation.mutateAsync(store.sessionId);
      const session = (res as unknown as { data?: Record<string, unknown> })?.data;
      store.markSubmitted(session?.score as number ?? 0, session?.isPassed as boolean | null ?? null);
    } catch {
      toast({ title: 'Gagal mengumpulkan ujian', variant: 'destructive' });
    }
  };

  // ── Submitted result view ─────────────────────────────────────────────────
  if (store.isSubmitted) {
    return <ExamResultPanel score={store.finalScore ?? 0} isPassed={store.isPassed} examTitle={store.examTitle} sessionId={store.sessionId} />;
  }

  // ── Loading / starting ────────────────────────────────────────────────────
  if (isStarting || !store.sessionId) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Mempersiapkan sesi ujian...</p>
        {showTokenDialog && <TokenEntryDialog onSubmit={(t) => { setShowTokenDialog(false); doStart(t); }} onCancel={() => navigate('/my-exams')} />}
      </div>
    );
  }

  const questionType = (currentQuestion?.type ?? 'MULTIPLE_CHOICE') as string;
  const options = (currentQuestion?.options ?? []) as Array<{ id: string; content: string }>;
  const totalQ = store.questionOrder.length;
  const progress = totalQ > 0 ? (answeredCount / totalQ) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 -mx-6 -mt-6 px-6 py-3 bg-card border-b shadow-sm mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading font-semibold text-base truncate">{store.examTitle}</h1>
          <p className="text-xs text-muted-foreground">{answeredCount}/{totalQ} dijawab · {doubtfulCount} ragu-ragu</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <TimerDisplay seconds={secondsLeft} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Send className="h-4 w-4" />Kumpulkan</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Kumpulkan Ujian?</AlertDialogTitle>
                <AlertDialogDescription>
                  Anda telah menjawab <strong>{answeredCount}</strong> dari <strong>{totalQ}</strong> soal.
                  {totalQ - answeredCount > 0 && ` ${totalQ - answeredCount} soal masih belum dijawab.`}
                  <br />Jawaban tidak dapat diubah setelah dikumpulkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Lanjut Mengerjakan</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit} disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? 'Mengumpulkan...' : 'Ya, Kumpulkan'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Progress value={progress} className="h-1.5 mb-6 rounded-full" />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
        {/* Question panel */}
        <div className="space-y-5">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-3 mb-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-mono text-sm font-bold">
                {store.currentIndex + 1}
              </span>
              <div className="flex-1">
                {currentAnswer?.isDoubtful && (
                  <Badge variant="outline" className="mb-2 text-amber-600 border-amber-300 bg-amber-50 gap-1">
                    <Flag className="h-3 w-3" />Ragu-ragu
                  </Badge>
                )}
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  {(currentQuestion?.content ?? 'Memuat soal...') as string}
                </p>
              </div>
            </div>

            {/* Options */}
            {questionType !== 'ESSAY' ? (
              <div className="space-y-2.5 mt-4">
                {options.map((opt, i) => {
                  const isSelected = currentAnswer?.selectedOptions?.includes(opt.id) ?? false;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleOptionSelect(opt.id, questionType === 'MULTIPLE_ANSWER')}
                      className={cn(
                        'w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all duration-150 hover:border-primary/50',
                        isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:bg-accent/30',
                      )}
                    >
                      <div className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 text-muted-foreground',
                      )}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-sm leading-relaxed">{opt.content}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <Textarea
                className="mt-4 min-h-[160px] resize-y"
                placeholder="Tulis jawaban uraian Anda di sini..."
                value={currentAnswer?.essayAnswer ?? ''}
                onChange={(e) => handleEssayChange(e.target.value)}
              />
            )}
          </div>

          {/* Navigation arrows */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={store.currentIndex <= 0} onClick={() => store.setCurrentIndex(store.currentIndex - 1)} className="gap-1">
              <ChevronLeft className="h-4 w-4" />Sebelumnya
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDoubtful} className={cn('gap-1.5', currentAnswer?.isDoubtful ? 'text-amber-600' : 'text-muted-foreground')}>
              <Flag className="h-4 w-4" />{currentAnswer?.isDoubtful ? 'Batalkan Ragu' : 'Tandai Ragu-ragu'}
            </Button>
            <Button variant="outline" size="sm" disabled={store.currentIndex >= totalQ - 1} onClick={() => store.setCurrentIndex(store.currentIndex + 1)} className="gap-1">
              Berikutnya<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation grid sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-[90px] rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Navigasi Soal</p>
            <div className="question-nav-grid mb-4">
              {store.questionOrder.map((eqId, idx) => {
                const ans = store.answers[eqId];
                const isAnswered = (ans?.selectedOptions?.length ?? 0) > 0 || !!ans?.essayAnswer;
                const isCurrent = idx === store.currentIndex;
                const isDoubtful = ans?.isDoubtful;
                return (
                  <button
                    key={eqId}
                    type="button"
                    onClick={() => store.setCurrentIndex(idx)}
                    className={cn('question-pill',
                      isCurrent ? 'question-pill--current' :
                        isDoubtful ? 'question-pill--doubtful' :
                          isAnswered ? 'question-pill--answered' : 'question-pill--unanswered',
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            {/* Legend */}
            <div className="space-y-1.5 text-xs">
              {[
                { cls: 'question-pill--answered', label: 'Dijawab' },
                { cls: 'question-pill--doubtful', label: 'Ragu-ragu' },
                { cls: 'question-pill--unanswered', label: 'Belum dijawab' },
              ].map(({ cls, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={cn('question-pill h-5 w-5 text-[10px]', cls)} style={{ minWidth: '1.25rem' }}>•</div>
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
