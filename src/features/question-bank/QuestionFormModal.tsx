import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useQuestion, useCreateQuestion, useUpdateQuestion, useSubjects } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const optionSchema = z.object({ content: z.string().min(1, 'Isi pilihan'), isCorrect: z.boolean(), order: z.number() });

const schema = z.object({
  subjectId: z.string().min(1, 'Pilih mata pelajaran'),
  type: z.enum(['MULTIPLE_CHOICE', 'MULTIPLE_ANSWER', 'TRUE_FALSE', 'ESSAY']),
  content: z.string().min(3, 'Konten soal minimal 3 karakter'),
  difficultyLevel: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  topic: z.string().optional(),
  points: z.coerce.number().int().min(1).max(100).default(10),
  explanation: z.string().optional(),
  options: z.array(optionSchema).default([]),
});
type FormData = z.infer<typeof schema>;

export default function QuestionFormModal({ questionId, onClose }: { questionId: string | null; onClose: () => void }) {
  const isEdit = !!questionId;
  const { data: existingData, isLoading } = useQuestion(questionId ?? '');
  const { data: subjectsData } = useSubjects();
  const createMutation = useCreateQuestion();
  const updateMutation = useUpdateQuestion();

  const existing = (existingData as unknown as { data?: Record<string, unknown> })?.data;
  const subjects = (subjectsData as unknown as { data?: { id: string; name: string }[] })?.data ?? [];

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'MULTIPLE_CHOICE', difficultyLevel: 'MEDIUM', points: 10, options: [{ content: '', isCorrect: false, order: 1 }, { content: '', isCorrect: false, order: 2 }, { content: '', isCorrect: false, order: 3 }, { content: '', isCorrect: false, order: 4 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'options' });
  const type = watch('type');

  useEffect(() => {
    if (existing && isEdit) {
      reset({
        subjectId: existing.subjectId as string,
        type: existing.type as FormData['type'],
        content: existing.content as string,
        difficultyLevel: existing.difficultyLevel as FormData['difficultyLevel'],
        topic: (existing.topic as string) ?? '',
        points: existing.points as number,
        explanation: (existing.explanation as string) ?? '',
        options: (existing.options as Array<{ content: string; isCorrect: boolean; order: number }>) ?? [],
      });
    }
  }, [existing, isEdit, reset]);

  const handleTypeChange = (val: string) => {
    setValue('type', val as FormData['type']);
    if (val === 'TRUE_FALSE') {
      setValue('options', [{ content: 'Benar', isCorrect: true, order: 1 }, { content: 'Salah', isCorrect: false, order: 2 }]);
    } else if (val === 'ESSAY') {
      setValue('options', []);
    } else if (fields.length < 2) {
      setValue('options', [{ content: '', isCorrect: false, order: 1 }, { content: '', isCorrect: false, order: 2 }]);
    }
  };

  const handleCorrectToggle = (idx: number, checked: boolean) => {
    if (type === 'MULTIPLE_CHOICE') {
      fields.forEach((_, i) => setValue(`options.${i}.isCorrect`, i === idx));
    } else {
      setValue(`options.${idx}.isCorrect`, checked);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: questionId!, ...data });
        toast({ title: '✅ Soal berhasil diperbarui' });
      } else {
        await createMutation.mutateAsync(data);
        toast({ title: '✅ Soal berhasil dibuat' });
      }
      onClose();
    } catch {
      toast({ title: 'Gagal menyimpan soal', variant: 'destructive' });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? 'Edit Soal' : 'Tambah Soal Baru'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Mata Pelajaran <span className="text-destructive">*</span></Label>
              <Select value={watch('subjectId')} onValueChange={(v) => setValue('subjectId', v)}>
                <SelectTrigger><SelectValue placeholder="Pilih mapel" /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tipe Soal <span className="text-destructive">*</span></Label>
              <Select value={type} onValueChange={handleTypeChange} disabled={isEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MULTIPLE_CHOICE">Pilihan Ganda</SelectItem>
                  <SelectItem value="MULTIPLE_ANSWER">PG Kompleks</SelectItem>
                  <SelectItem value="TRUE_FALSE">Benar / Salah</SelectItem>
                  <SelectItem value="ESSAY">Uraian / Essay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Konten Soal <span className="text-destructive">*</span></Label>
            <Textarea {...register('content')} rows={4} placeholder="Tulis konten soal di sini..." className={errors.content ? 'border-destructive' : ''} />
            {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Tingkat Kesulitan</Label>
              <Select value={watch('difficultyLevel')} onValueChange={(v) => setValue('difficultyLevel', v as FormData['difficultyLevel'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASY">Mudah</SelectItem>
                  <SelectItem value="MEDIUM">Sedang</SelectItem>
                  <SelectItem value="HARD">Sulit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Poin</Label>
              <Input type="number" {...register('points')} min={1} max={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Topik</Label>
              <Input {...register('topic')} placeholder="Opsional" />
            </div>
          </div>

          {/* Options */}
          {type !== 'ESSAY' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Pilihan Jawaban {type === 'MULTIPLE_CHOICE' && <span className="text-xs text-muted-foreground">(centang satu yang benar)</span>}</Label>
                {type !== 'TRUE_FALSE' && (
                  <Button type="button" variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => append({ content: '', isCorrect: false, order: fields.length + 1 })}>
                    <Plus className="h-3.5 w-3.5" />Tambah Pilihan
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {fields.map((field, idx) => {
                  const isCorrect = watch(`options.${idx}.isCorrect`);
                  return (
                    <div key={field.id} className={cn('flex items-center gap-2 rounded-lg border p-2.5 transition-colors', isCorrect && 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30')}>
                      <span className="font-mono text-xs text-muted-foreground w-5 shrink-0">{String.fromCharCode(65 + idx)}.</span>
                      <Input {...register(`options.${idx}.content`)} placeholder={`Pilihan ${String.fromCharCode(65 + idx)}`} className="flex-1 border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm" disabled={type === 'TRUE_FALSE'} />
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        <Checkbox checked={isCorrect} onCheckedChange={(c) => handleCorrectToggle(idx, !!c)} />
                        {type !== 'TRUE_FALSE' && fields.length > 2 && (
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Pembahasan / Penjelasan</Label>
            <Textarea {...register('explanation')} rows={2} placeholder="Penjelasan jawaban (opsional, tampil setelah ujian)" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" /> : null}
              {isEdit ? 'Perbarui Soal' : 'Simpan Soal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
