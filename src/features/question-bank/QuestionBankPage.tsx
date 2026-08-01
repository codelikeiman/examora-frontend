import { useState, useRef } from 'react';
import { Plus, Upload, Search, Filter, BookOpen, Trash2, Pencil, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuestions, useDeleteQuestion, useImportQuestions, useSubjects } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import QuestionFormModal from './QuestionFormModal';

const TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: 'PG', MULTIPLE_ANSWER: 'PG Kompleks',
  TRUE_FALSE: 'Benar/Salah', ESSAY: 'Uraian',
};
const DIFF_COLORS: Record<string, string> = {
  EASY: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200',
  HARD: 'text-red-600 bg-red-50 border-red-200',
};
const DIFF_LABELS: Record<string, string> = { EASY: 'Mudah', MEDIUM: 'Sedang', HARD: 'Sulit' };

export default function QuestionBankPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [type, setType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const params = { page, limit: 15, search: search || undefined, subjectId: subjectId || undefined, type: type || undefined, difficultyLevel: difficulty || undefined, isActive: true };
  const { data: qData, isLoading } = useQuestions(params);
  const { data: subjectsData } = useSubjects();
  const deleteMutation = useDeleteQuestion();
  const importMutation = useImportQuestions();

  const questions = (qData as unknown as { data?: Record<string, unknown>[] })?.data ?? [];
  const meta = (qData as { meta?: { total: number; totalPages: number } })?.meta;
  const subjects = (subjectsData as unknown as { data?: { id: string; name: string }[] })?.data ?? [];

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await importMutation.mutateAsync(file);
      const result = (res as unknown as { data?: { created: number; errors?: { row: number; message: string }[] } })?.data;
      toast({ title: `✅ Berhasil mengimpor ${result?.created ?? 0} soal`, description: result?.errors?.length ? `${result.errors.length} baris gagal` : undefined });
    } catch {
      toast({ title: 'Gagal mengimpor', variant: 'destructive' });
    }
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteMutation.mutateAsync(id);
      if (result.data?.archived) {
        toast({
          title: '📦 Soal diarsipkan',
          description: 'Soal ini sudah pernah dipakai di ujian, jadi dinonaktifkan (bukan dihapus permanen) agar riwayat & nilai ujian tetap utuh.',
        });
      } else {
        toast({ title: '✅ Soal berhasil dihapus' });
      }
    } catch {
      toast({ title: 'Gagal menghapus soal', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bank Soal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola soal ujian lintas mata pelajaran</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={importMutation.isPending}>
            <Upload className="h-4 w-4" />{importMutation.isPending ? 'Mengimpor...' : 'Import Excel/CSV'}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setEditId(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />Tambah Soal
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari konten soal..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8" />
            </div>
            <Select value={subjectId} onValueChange={(v) => { setSubjectId(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Mata Pelajaran" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mapel</SelectItem>
                {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => { setType(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipe Soal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={(v) => { setDifficulty(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Kesulitan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="EASY">Mudah</SelectItem>
                <SelectItem value="MEDIUM">Sedang</SelectItem>
                <SelectItem value="HARD">Sulit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            {meta ? `${meta.total} soal ditemukan` : 'Memuat...'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-y">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[50px]">No</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Soal</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Tipe</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Kesulitan</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">Topik</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                  ))
                ) : questions.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-16 text-muted-foreground">
                    <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>Tidak ada soal ditemukan</p>
                  </td></tr>
                ) : questions.map((q, idx) => (
                  <tr key={q.id as string} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{(page - 1) * 15 + idx + 1}</td>
                    <td className="px-4 py-3 max-w-[320px]">
                      <p className="line-clamp-2 leading-snug">{q.content as string}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[q.type as string] ?? q.type as string}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${DIFF_COLORS[q.difficultyLevel as string] ?? ''}`}>
                        {DIFF_LABELS[q.difficultyLevel as string] ?? q.difficultyLevel as string}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">{q.topic as string || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditId(q.id as string); setShowForm(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Soal?</AlertDialogTitle>
                              <AlertDialogDescription>Soal yang dihapus tidak bisa dikembalikan.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(q.id as string)} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">Halaman {page} dari {meta.totalPages}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <QuestionFormModal questionId={editId} onClose={() => { setShowForm(false); setEditId(null); }} />
      )}
    </div>
  );
}
