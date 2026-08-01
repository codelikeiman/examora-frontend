import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Search, UserPlus, UserMinus, ArrowRightLeft } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';

interface ClassDetail {
  id: string;
  name: string;
  gradeLevel: number | null;
  students: Array<{ id: string; name: string; email: string; username: string }>;
}

interface StudentSearchResult {
  id: string;
  name: string;
  email: string;
  username: string;
  currentClassId: string | null;
  currentClassName: string | null;
}

export default function ManageStudentsDialog({ classId, className, onClose }: {
  classId: string;
  className: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: detailData, isLoading: loadingDetail } = useQuery({
    queryKey: ['classes', classId, 'detail'],
    queryFn: () => apiClient.get<ClassDetail>(`/classes/${classId}`),
  });
  const detail = (detailData as unknown as { data?: ClassDetail })?.data;

  const { data: searchData, isLoading: loadingSearch } = useQuery({
    queryKey: ['classes', 'search-students', search],
    queryFn: () => apiClient.get<StudentSearchResult[]>('/classes/search/students', { search: search || undefined }),
  });
  const searchResults = (searchData as unknown as { data?: StudentSearchResult[] })?.data ?? [];

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['classes', classId, 'detail'] });
    qc.invalidateQueries({ queryKey: ['classes', 'search-students'] });
    qc.invalidateQueries({ queryKey: ['classes'] });
    qc.invalidateQueries({ queryKey: ['users'] });
  };

  const addMutation = useMutation({
    mutationFn: (studentId: string) => apiClient.post(`/classes/${classId}/students`, { studentIds: [studentId] }),
    onSuccess: () => { invalidateAll(); toast({ title: '✅ Siswa berhasil ditambahkan ke kelas' }); },
    onError: () => toast({ title: 'Gagal menambahkan siswa', variant: 'destructive' }),
  });

  const removeMutation = useMutation({
    mutationFn: (studentId: string) => apiClient.delete(`/classes/${classId}/students/${studentId}`),
    onSuccess: () => { invalidateAll(); toast({ title: '✅ Siswa dikeluarkan dari kelas' }); },
    onError: () => toast({ title: 'Gagal mengeluarkan siswa', variant: 'destructive' }),
  });

  const currentStudentIds = new Set((detail?.students ?? []).map((s) => s.id));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Kelola Siswa — {className}</DialogTitle>
          <DialogDescription>
            Tambah atau keluarkan siswa dari kelas ini. Menambahkan siswa yang sudah berada di kelas
            lain akan otomatis memindahkannya ke kelas ini.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Current roster */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Siswa di Kelas Ini ({detail?.students.length ?? 0})</p>
            <div className="rounded-lg border divide-y max-h-80 overflow-y-auto">
              {loadingDetail ? (
                <div className="p-3 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : !detail?.students.length ? (
                <p className="p-4 text-center text-xs text-muted-foreground">Belum ada siswa di kelas ini</p>
              ) : detail.students.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Keluarkan dari kelas" disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate(s.id)}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Search & add */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Cari & Tambah Siswa</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nama, email, atau username..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="rounded-lg border divide-y max-h-72 overflow-y-auto">
              {loadingSearch ? (
                <div className="p-3 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : searchResults.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">Tidak ada siswa ditemukan</p>
              ) : searchResults.map((s) => {
                const alreadyInThisClass = currentStudentIds.has(s.id);
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.email}
                        {s.currentClassId && s.currentClassId !== classId && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-600">
                            <ArrowRightLeft className="h-3 w-3" />saat ini di {s.currentClassName}
                          </span>
                        )}
                      </p>
                    </div>
                    {alreadyInThisClass ? (
                      <span className="text-xs text-emerald-600 font-medium shrink-0">Sudah di kelas ini</span>
                    ) : (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-primary hover:text-primary hover:bg-primary/10"
                        title={s.currentClassId ? `Pindahkan dari ${s.currentClassName}` : 'Tambahkan ke kelas'}
                        disabled={addMutation.isPending}
                        onClick={() => addMutation.mutate(s.id)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
