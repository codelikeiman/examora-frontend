import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Trash2, Key, Trophy, BarChart3, Eye,
  ChevronLeft, BookOpen, Shield, RefreshCw, CheckCircle2, Clock
} from 'lucide-react';
import {
  useExam, useCreateExam, useUpdateExam, usePublishExam,
  useExamPool, useAddQuestions, useSubjects, useGenerateToken,
  useExamTokens, useQuestions, useClasses,
} from '@/lib/queries';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { formatDateTime, cn } from '@/lib/utils';
import { useUserRole } from '@/stores/auth.store';

const examSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter'),
  subjectId: z.string().min(1, 'Pilih mata pelajaran'),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().int().min(1).max(480),
  startTime: z.string().min(1, 'Waktu mulai wajib diisi'),
  endTime: z.string().min(1, 'Waktu selesai wajib diisi'),
  questionCount: z.coerce.number().int().min(1),
  passingScore: z.coerce.number().min(0).max(100),
  maxAttempts: z.coerce.number().int().min(1).max(3),
  randomizeQuestions: z.boolean().default(true),
  randomizeOptions: z.boolean().default(true),
  requireToken: z.boolean().default(true),
  showResultImmediately: z.boolean().default(true),
  instructions: z.string().optional(),
  classIds: z.array(z.string()).min(1, 'Pilih minimal 1 kelas'),
});

type ExamForm = z.infer<typeof examSchema>;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  PUBLISHED: { label: 'Dipublikasi', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  ONGOING: { label: 'Berlangsung', color: 'bg-green-100 text-green-700 border-green-200' },
  FINISHED: { label: 'Selesai', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  ARCHIVED: { label: 'Diarsipkan', color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function toDatetimeLocal(date: string | Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

// ── Exam Form (Create / Edit) ─────────────────────────────────────────────────
export function ExamFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: existingData, isLoading } = useExam(id ?? '', { enabled: !!id } as never);
  const { data: subjectsData } = useSubjects();
  const { data: classesData, isLoading: loadingClasses } = useClasses();
  const createMutation = useCreateExam();
  const updateMutation = useUpdateExam();

  const exam = (existingData as unknown as { data?: Record<string, unknown> })?.data;
  const subjects = (subjectsData as unknown as { data?: { id: string; name: string }[] })?.data ?? [];
  const classes = (classesData as unknown as { data?: { id: string; name: string; gradeLevel: number | null }[] })?.data ?? [];

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<ExamForm>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: '', subjectId: '', durationMinutes: 90, questionCount: 40,
      passingScore: 70, maxAttempts: 1, randomizeQuestions: true,
      randomizeOptions: true, requireToken: true, showResultImmediately: true,
      classIds: [],
    },
  });

  const selectedClassIds = watch('classIds') ?? [];
  const toggleClass = (classId: string) => {
    const current = selectedClassIds;
    setValue(
      'classIds',
      current.includes(classId) ? current.filter((c) => c !== classId) : [...current, classId],
      { shouldValidate: true },
    );
  };

  useEffect(() => {
    if (exam && isEdit) {
      setValue('title', exam.title as string);
      setValue('subjectId', exam.subjectId as string);
      setValue('description', (exam.description as string) ?? '');
      setValue('durationMinutes', exam.durationMinutes as number);
      setValue('startTime', toDatetimeLocal(exam.startTime as string));
      setValue('endTime', toDatetimeLocal(exam.endTime as string));
      setValue('questionCount', exam.questionCount as number);
      setValue('passingScore', Number(exam.passingScore));
      setValue('maxAttempts', exam.maxAttempts as number);
      setValue('randomizeQuestions', exam.randomizeQuestions as boolean);
      setValue('randomizeOptions', exam.randomizeOptions as boolean);
      setValue('requireToken', exam.requireToken as boolean);
      setValue('showResultImmediately', exam.showResultImmediately as boolean);
      setValue('instructions', (exam.instructions as string) ?? '');
      if (Array.isArray(exam.classIds)) setValue('classIds', exam.classIds as string[]);
    }
  }, [exam, isEdit, setValue]);

  const onSubmit = async (data: ExamForm) => {
    try {
      const payload = {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      };
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, ...payload });
        toast({ title: '✅ Ujian berhasil diperbarui' });
      } else {
        const res = await createMutation.mutateAsync(payload);
        const newId = (res as unknown as { data?: { id: string } })?.data?.id;
        toast({ title: '✅ Ujian berhasil dibuat' });
        if (newId) navigate(`/exams/${newId}`);
        return;
      }
      navigate(`/exams/${id}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast({ title: 'Gagal menyimpan ujian', description: msg, variant: 'destructive' });
    }
  };

  if (isEdit && isLoading) return <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  const CheckboxField = ({ name, label }: { name: keyof ExamForm; label: string }) => (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <input type="checkbox" {...register(name as string)} className="h-4 w-4 rounded border-input accent-primary" />
      <span className="text-sm text-foreground group-hover:text-primary transition-colors">{label}</span>
    </label>
  );

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/exams"><ChevronLeft className="h-5 w-5" /></Link></Button>
        <h1 className="page-title">{isEdit ? 'Edit Ujian' : 'Buat Ujian Baru'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-base">Informasi Dasar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Judul Ujian <span className="text-destructive">*</span></Label>
              <Input {...register('title')} placeholder="Ujian Tengah Semester Matematika" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Mata Pelajaran <span className="text-destructive">*</span></Label>
                <Controller name="subjectId" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Pilih mapel" /></SelectTrigger>
                    <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
                {errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Durasi (menit) <span className="text-destructive">*</span></Label>
                <Input type="number" {...register('durationMinutes')} min={1} max={480} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Waktu Mulai <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" {...register('startTime')} />
              </div>
              <div className="space-y-1.5">
                <Label>Waktu Selesai <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" {...register('endTime')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Instruksi Ujian</Label>
              <Textarea {...register('instructions')} rows={3} placeholder="Kerjakan soal dengan teliti..." />
            </div>
            <div className="space-y-1.5">
              <Label>Kelas Peserta <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">Pilih satu atau lebih kelas yang akan mengikuti ujian ini</p>
              {loadingClasses ? (
                <Skeleton className="h-10 w-full" />
              ) : classes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Belum ada kelas terdaftar. Hubungi admin untuk menambahkan kelas di menu Sekolah & Kelas.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {classes.map((c) => {
                    const active = selectedClassIds.includes(c.id);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => toggleClass(c.id)}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground hover:bg-accent border-input',
                        )}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.classIds && <p className="text-xs text-destructive">{errors.classIds.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pengaturan Soal & Penilaian</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Jumlah Soal per Ujian</Label>
                <Input type="number" {...register('questionCount')} min={1} />
              </div>
              <div className="space-y-1.5">
                <Label>Nilai KKM (%)</Label>
                <Input type="number" {...register('passingScore')} min={0} max={100} />
              </div>
              <div className="space-y-1.5">
                <Label>Maks. Percobaan</Label>
                <Input type="number" {...register('maxAttempts')} min={1} max={3} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 pt-1">
              <CheckboxField name="randomizeQuestions" label="Acak urutan soal" />
              <CheckboxField name="randomizeOptions" label="Acak pilihan jawaban" />
              <CheckboxField name="requireToken" label="Wajib token ujian" />
              <CheckboxField name="showResultImmediately" label="Tampilkan nilai langsung" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/exams')}>Batal</Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {(createMutation.isPending || updateMutation.isPending) && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {isEdit ? 'Simpan Perubahan' : 'Buat Ujian'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Exam Detail Page ──────────────────────────────────────────────────────────
export function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useExam(id ?? '');
  const publishMutation = usePublishExam();
  const { data: poolData } = useExamPool(id ?? '');
  const { data: tokensData, refetch: refetchTokens } = useExamTokens(id ?? '');
  const generateToken = useGenerateToken(id ?? '');
  const addQuestions = useAddQuestions(id ?? '');
  const { data: questionsData } = useQuestions({ limit: 100, isActive: true });
  const isGuru = useUserRole() === 'GURU';

  const [selectedQIds, setSelectedQIds] = useState<string[]>([]);

  const exam = (data as unknown as { data?: Record<string, unknown> })?.data;
  const pool = (poolData as unknown as { data?: Record<string, unknown>[] })?.data ?? [];
  const tokens = (tokensData as unknown as { data?: Record<string, unknown>[] })?.data ?? [];
  const questions = (questionsData as unknown as { data?: Record<string, unknown>[] })?.data ?? [];

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  if (!exam) return <div className="text-center py-16 text-muted-foreground">Ujian tidak ditemukan.</div>;

  const statusConfig = STATUS_CONFIG[exam.status as string] ?? STATUS_CONFIG.DRAFT;
  const isDraft = exam.status === 'DRAFT';

  const handlePublish = async () => {
    try {
      await publishMutation.mutateAsync(id!);
      toast({ title: '✅ Ujian berhasil dipublikasikan' });
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast({ title: 'Gagal mempublikasikan', description: msg, variant: 'destructive' });
    }
  };

  const handleStartExam = async () => {
    try {
      await apiClient.post(`/exams/${id}/start`);
      toast({ title: '✅ Ujian dimulai' });
    } catch {
      toast({ title: 'Gagal memulai ujian', variant: 'destructive' });
    }
  };

  const handleAddSelected = async () => {
    if (!selectedQIds.length) return;
    try {
      await addQuestions.mutateAsync({ questionIds: selectedQIds });
      setSelectedQIds([]);
      toast({ title: `✅ ${selectedQIds.length} soal berhasil ditambahkan` });
    } catch {
      toast({ title: 'Gagal menambahkan soal', variant: 'destructive' });
    }
  };

  const handleGenToken = async () => {
    try {
      await generateToken.mutateAsync({});
      refetchTokens();
      toast({ title: '✅ Token ujian berhasil dibuat' });
    } catch {
      toast({ title: 'Gagal membuat token', variant: 'destructive' });
    }
  };

  const poolIds = new Set(pool.map((p) => p.questionId as string));
  const availableQuestions = questions.filter((q) => !poolIds.has(q.id as string));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-0.5"><Link to="/exams"><ChevronLeft className="h-5 w-5" /></Link></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', statusConfig.color)}>
              {statusConfig.label}
            </span>
            <h1 className="text-xl font-heading font-semibold">{exam.title as string}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{exam.subjectName as string} · {exam.durationMinutes as number} menit · KKM {Number(exam.passingScore)}%</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {isDraft && isGuru && <Button variant="outline" size="sm" asChild><Link to={`/exams/${id}/edit`}>Edit</Link></Button>}
          {isDraft && isGuru && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={publishMutation.isPending}><CheckCircle2 className="h-4 w-4 mr-1.5" />Publikasikan</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Publikasikan Ujian?</AlertDialogTitle>
                  <AlertDialogDescription>Pastikan pool soal sudah lengkap ({pool.length}/{exam.questionCount as number} soal). Setelah dipublikasikan, soal tidak bisa diubah.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePublish}>Ya, Publikasikan</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {exam.status === 'PUBLISHED' && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleStartExam}>
              <Clock className="h-4 w-4 mr-1.5" />Mulai Ujian
            </Button>
          )}
          {(exam.status === 'ONGOING' || exam.status === 'FINISHED') && (
            <Button size="sm" variant="outline" onClick={() => navigate(`/exams/${id}/results`)}>
              <Trophy className="h-4 w-4 mr-1.5" />Hasil Ujian
            </Button>
          )}
          {exam.status === 'FINISHED' && (
            <Button size="sm" variant="outline" onClick={() => navigate(`/analytics/${id}`)}>
              <BarChart3 className="h-4 w-4 mr-1.5" />Analitik
            </Button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Soal di Pool', value: pool.length, suffix: `/ ${exam.questionCount as number} per ujian`, ok: pool.length >= (exam.questionCount as number) },
          { label: 'Peserta Selesai', value: exam.sessionCount as number ?? 0, suffix: 'sesi' },
          { label: 'Waktu Mulai', value: formatDateTime(exam.startTime as string), isText: true },
          { label: 'Waktu Selesai', value: formatDateTime(exam.endTime as string), isText: true },
        ].map(({ label, value, suffix, ok, isText }) => (
          <div key={label} className="stat-card">
            <p className={cn('font-heading font-bold', isText ? 'text-sm' : 'text-2xl', ok === false && 'text-amber-500', ok === true && 'text-emerald-500')}>
              {value}
            </p>
            {suffix && <p className="text-xs text-muted-foreground">{suffix}</p>}
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue={isDraft ? 'pool' : 'tokens'}>
        <TabsList>
          <TabsTrigger value="pool"><BookOpen className="h-3.5 w-3.5 mr-1.5" />Pool Soal ({pool.length})</TabsTrigger>
          <TabsTrigger value="tokens"><Key className="h-3.5 w-3.5 mr-1.5" />Token Ujian</TabsTrigger>
        </TabsList>

        {/* Question Pool Tab */}
        <TabsContent value="pool" className="space-y-4">
          {isDraft && isGuru && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Tambah Soal ke Pool</CardTitle>
                <CardDescription>Centang soal dari bank soal lalu klik tambah, atau gunakan tambah acak</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-lg border p-2">
                  {availableQuestions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Semua soal sudah ada di pool</p>
                  ) : availableQuestions.map((q) => (
                    <label key={q.id as string} className="flex items-start gap-2.5 cursor-pointer hover:bg-accent p-1.5 rounded-md">
                      <input type="checkbox" className="mt-0.5 accent-primary" checked={selectedQIds.includes(q.id as string)}
                        onChange={(e) => setSelectedQIds((prev) => e.target.checked ? [...prev, q.id as string] : prev.filter((x) => x !== q.id as string))} />
                      <div className="min-w-0">
                        <p className="text-xs line-clamp-1">{q.content as string}</p>
                        <p className="text-[10px] text-muted-foreground">{q.type as string} · {q.difficultyLevel as string}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={handleAddSelected} disabled={!selectedQIds.length || addQuestions.isPending}>
                    <Plus className="h-3.5 w-3.5" />Tambah Terpilih ({selectedQIds.length})
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={async () => {
                    try {
                      await apiClient.post(`/exams/${id}/questions/random`, {
                        count: Math.max(1, (exam.questionCount as number) - pool.length),
                        subjectId: exam.subjectId,
                      });
                      toast({ title: '✅ Soal acak berhasil ditambahkan' });
                    } catch { toast({ title: 'Gagal tambah acak', variant: 'destructive' }); }
                  }}>
                    <RefreshCw className="h-3.5 w-3.5" />Tambah Acak
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-0">
              {pool.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Pool soal masih kosong</p></div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-y"><tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-10">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Soal</th>
                    {isDraft && <th className="px-4 py-2.5 w-10" />}
                  </tr></thead>
                  <tbody className="divide-y">
                    {pool.map((eq, idx) => (
                      <tr key={eq.id as string} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-xs line-clamp-1 max-w-[400px]">
                          {(eq.questionContent as string) ?? `Soal #${idx + 1}`}
                        </td>
                        {isDraft && (
                          <td className="px-4 py-2.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={async () => {
                              await apiClient.delete(`/exams/${id}/questions/${eq.questionId}`);
                              toast({ title: 'Soal dihapus dari pool' });
                            }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tokens Tab */}
        <TabsContent value="tokens" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Token Akses Ujian</CardTitle>
                <CardDescription>Token 6-karakter yang diberikan pengawas kepada siswa untuk masuk ujian</CardDescription>
              </div>
              <Button size="sm" className="gap-1.5 shrink-0" onClick={handleGenToken} disabled={generateToken.isPending}>
                <Key className="h-4 w-4" />Generate Token
              </Button>
            </CardHeader>
            <CardContent>
              {tokens.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Key className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Belum ada token dibuat</p></div>
              ) : (
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                  {tokens.map((t) => (
                    <div key={t.id as string} className={cn('rounded-xl border-2 p-3 text-center transition-all', t.isActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 opacity-60')}>
                      <p className="font-mono font-bold text-xl tracking-[0.2em] text-primary">{t.token as string}</p>
                      <Badge variant={t.isActive ? 'default' : 'secondary'} className="mt-1.5 text-[10px]">
                        {t.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                      {t.expiresAt && <p className="text-[10px] text-muted-foreground mt-1">Exp: {formatDateTime(t.expiresAt as string)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ExamDetailPage;
