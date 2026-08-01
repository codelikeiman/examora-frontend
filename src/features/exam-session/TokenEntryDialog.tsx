import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Home, RotateCcw, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ── Token Entry Dialog ────────────────────────────────────────────────────────
export function TokenEntryDialog({ onSubmit, onCancel }: { onSubmit: (token: string) => void; onCancel: () => void }) {
  const [token, setToken] = useState('');
  return (
    <Dialog open>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />Token Ujian Diperlukan
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">Masukkan token yang diberikan oleh pengawas ujian untuk memulai.</p>
          <Input
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            placeholder="Contoh: 7K2P9X"
            className="font-mono text-lg tracking-[0.3em] text-center uppercase"
            maxLength={8}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && token.length >= 4) onSubmit(token); }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Batal</Button>
          <Button onClick={() => onSubmit(token)} disabled={token.length < 4}>Masuk Ujian</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Exam Result Panel ─────────────────────────────────────────────────────────
export function ExamResultPanel({ score, isPassed, examTitle }: { score: number; isPassed: boolean | null; examTitle: string }) {
  const passed = isPassed === true;
  const pending = isPassed === null; // essay not yet graded

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className={cn(
        'flex h-24 w-24 items-center justify-center rounded-full mb-6',
        pending ? 'bg-amber-100 dark:bg-amber-950' : passed ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-red-100 dark:bg-red-950',
      )}>
        {pending
          ? <span className="text-4xl">⏳</span>
          : passed
            ? <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            : <XCircle className="h-12 w-12 text-red-500" />}
      </div>

      <h1 className="text-2xl font-heading font-bold mb-1">
        {pending ? 'Ujian Dikumpulkan!' : passed ? 'Selamat, Anda Lulus!' : 'Ujian Selesai'}
      </h1>
      <p className="text-muted-foreground mb-6 max-w-sm">{examTitle}</p>

      <div className="rounded-2xl border bg-card p-8 shadow-sm mb-8 w-full max-w-xs">
        <p className="text-sm text-muted-foreground mb-1">Nilai Akhir</p>
        <p className={cn('text-6xl font-heading font-bold', passed ? 'text-emerald-500' : pending ? 'text-amber-500' : 'text-red-500')}>
          {score.toFixed(1)}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {pending ? 'Menunggu penilaian essay' : passed ? '✅ Lulus' : '❌ Belum Lulus'}
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" asChild className="gap-2">
          <Link to="/my-exams"><Home className="h-4 w-4" />Kembali</Link>
        </Button>
      </div>
    </div>
  );
}

export default TokenEntryDialog;
