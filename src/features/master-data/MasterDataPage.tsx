import { useState } from 'react';
import { School, Users, BookMarked, Plus, Pencil, Trash2, UserCog } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import ManageStudentsDialog from './ManageStudentsDialog';

type Item = Record<string, unknown>;

// Generic CRUD hook for master data entities
function useMasterData(entity: string) {
  const qc = useQueryClient();
  const key = [entity];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => apiClient.get<Item[]>(`/${entity}`, { all: 'true', limit: 100 }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: key });
  const createMut = useMutation({ mutationFn: (body: Item) => apiClient.post(`/${entity}`, body), onSuccess: invalidate });
  const updateMut = useMutation({ mutationFn: ({ id, ...body }: Item) => apiClient.patch(`/${entity}/${id as string}`, body), onSuccess: invalidate });
  const deleteMut = useMutation({ mutationFn: (id: string) => apiClient.delete(`/${entity}/${id}`), onSuccess: invalidate });
  return {
    items: (data as unknown as { data?: Item[] })?.data ?? [],
    isLoading, createMut, updateMut, deleteMut,
  };
}

interface QuickModalProps {
  title: string;
  fields: Array<{ name: string; label: string; required?: boolean; placeholder?: string }>;
  defaultValues?: Item;
  onSave: (data: Item) => Promise<void>;
  onClose: () => void;
  isPending: boolean;
}

function QuickModal({ title, fields, defaultValues, onSave, onClose, isPending }: QuickModalProps) {
  const [values, setValues] = useState<Item>(defaultValues ?? {});
  const handleSave = async () => {
    const missing = fields.filter(f => f.required && !values[f.name]);
    if (missing.length) { toast({ title: `${missing[0].label} wajib diisi`, variant: 'destructive' }); return; }
    await onSave(values);
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-heading">{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.name} className="space-y-1.5">
              <Label>{f.label} {f.required && <span className="text-destructive">*</span>}</Label>
              <Input value={(values[f.name] as string) ?? ''} placeholder={f.placeholder ?? f.label}
                onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))} />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EntityTable({ items, columns, onEdit, onDelete, isLoading, emptyText, extraActions }: {
  items: Item[];
  columns: Array<{ key: string; label: string; render?: (v: unknown, row: Item) => React.ReactNode }>;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  emptyText: string;
  extraActions?: (item: Item) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b">
          <tr>
            {columns.map(c => <th key={c.key} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{c.label}</th>)}
            <th className="px-4 py-3 w-32" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {isLoading ? Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}><td colSpan={columns.length + 1} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
          )) : items.length === 0 ? (
            <tr><td colSpan={columns.length + 1} className="py-10 text-center text-muted-foreground text-sm">{emptyText}</td></tr>
          ) : items.map(item => (
            <tr key={item.id as string} className="hover:bg-muted/20">
              {columns.map(c => (
                <td key={c.key} className="px-4 py-3">{c.render ? c.render(item[c.key], item) : (item[c.key] as string) ?? '—'}</td>
              ))}
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  {extraActions?.(item)}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus data ini?</AlertDialogTitle>
                        <AlertDialogDescription>Data yang dihapus tidak dapat dikembalikan.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => onDelete(item.id as string)}>Hapus</AlertDialogAction>
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
  );
}

export default function MasterDataPage() {
  const [modal, setModal] = useState<{ entity: string; item?: Item } | null>(null);
  const [manageStudentsFor, setManageStudentsFor] = useState<{ id: string; name: string } | null>(null);

  const schools = useMasterData('schools');
  const classes = useMasterData('classes');
  const subjects = useMasterData('subjects');

  const closeModal = () => setModal(null);

  const getSaveFn = (entity: string, crud: ReturnType<typeof useMasterData>) => async (data: Item) => {
    try {
      if (modal?.item) await crud.updateMut.mutateAsync({ id: modal.item.id, ...data });
      else await crud.createMut.mutateAsync(data);
      toast({ title: '✅ Data berhasil disimpan' });
      closeModal();
    } catch { toast({ title: 'Gagal menyimpan', variant: 'destructive' }); }
  };

  const MODALS: Record<string, { title: string; fields: QuickModalProps['fields']; crud: ReturnType<typeof useMasterData> }> = {
    schools: { title: modal?.item ? 'Edit Sekolah' : 'Tambah Sekolah', fields: [{ name: 'name', label: 'Nama Sekolah', required: true }, { name: 'npsn', label: 'NPSN' }, { name: 'address', label: 'Alamat' }], crud: schools },
    classes: { title: modal?.item ? 'Edit Kelas' : 'Tambah Kelas', fields: [{ name: 'name', label: 'Nama Kelas', required: true, placeholder: 'XII IPA 1' }, { name: 'gradeLevel', label: 'Tingkat (contoh: 12)' }], crud: classes },
    subjects: { title: modal?.item ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran', fields: [{ name: 'name', label: 'Nama Mapel', required: true }, { name: 'code', label: 'Kode', required: true, placeholder: 'MTK' }, { name: 'description', label: 'Deskripsi' }], crud: subjects },
  };

  return (
    <div className="space-y-5">
      <h1 className="page-title">Data Master</h1>

      <Tabs defaultValue="subjects">
        <TabsList>
          <TabsTrigger value="subjects"><BookMarked className="h-4 w-4 mr-1.5" />Mata Pelajaran ({subjects.items.length})</TabsTrigger>
          <TabsTrigger value="classes"><Users className="h-4 w-4 mr-1.5" />Kelas ({classes.items.length})</TabsTrigger>
          <TabsTrigger value="schools"><School className="h-4 w-4 mr-1.5" />Sekolah ({schools.items.length})</TabsTrigger>
        </TabsList>

        {/* Subjects */}
        <TabsContent value="subjects" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setModal({ entity: 'subjects' })}>
              <Plus className="h-4 w-4" />Tambah Mata Pelajaran
            </Button>
          </div>
          <EntityTable
            items={subjects.items} isLoading={subjects.isLoading} emptyText="Belum ada mata pelajaran"
            columns={[{ key: 'code', label: 'Kode', render: (v) => <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{v as string}</span> }, { key: 'name', label: 'Nama' }, { key: 'description', label: 'Deskripsi' }]}
            onEdit={(item) => setModal({ entity: 'subjects', item })}
            onDelete={async (id) => { await subjects.deleteMut.mutateAsync(id); toast({ title: '✅ Mata pelajaran dihapus' }); }}
          />
        </TabsContent>

        {/* Classes */}
        <TabsContent value="classes" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setModal({ entity: 'classes' })}>
              <Plus className="h-4 w-4" />Tambah Kelas
            </Button>
          </div>
          <EntityTable
            items={classes.items} isLoading={classes.isLoading} emptyText="Belum ada kelas"
            columns={[{ key: 'name', label: 'Nama Kelas' }, { key: 'gradeLevel', label: 'Tingkat', render: (v) => v ? `Kelas ${v}` : '—' }, { key: 'studentCount', label: 'Siswa', render: (v) => <span className="font-mono">{(v as number) ?? 0}</span> }]}
            onEdit={(item) => setModal({ entity: 'classes', item })}
            onDelete={async (id) => { await classes.deleteMut.mutateAsync(id); toast({ title: '✅ Kelas dihapus' }); }}
            extraActions={(item) => (
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                title="Kelola siswa di kelas ini"
                onClick={() => setManageStudentsFor({ id: item.id as string, name: item.name as string })}
              >
                <UserCog className="h-3.5 w-3.5" />
              </Button>
            )}
          />
        </TabsContent>

        {/* Schools */}
        <TabsContent value="schools" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setModal({ entity: 'schools' })}>
              <Plus className="h-4 w-4" />Tambah Sekolah
            </Button>
          </div>
          <EntityTable
            items={schools.items} isLoading={schools.isLoading} emptyText="Belum ada sekolah"
            columns={[{ key: 'name', label: 'Nama Sekolah' }, { key: 'npsn', label: 'NPSN', render: (v) => <span className="font-mono text-xs">{(v as string) ?? '—'}</span> }, { key: 'address', label: 'Alamat' }]}
            onEdit={(item) => setModal({ entity: 'schools', item })}
            onDelete={async (id) => { await schools.deleteMut.mutateAsync(id); toast({ title: '✅ Sekolah dihapus' }); }}
          />
        </TabsContent>
      </Tabs>

      {modal && MODALS[modal.entity] && (
        <QuickModal
          title={MODALS[modal.entity].title}
          fields={MODALS[modal.entity].fields}
          defaultValues={modal.item}
          isPending={MODALS[modal.entity].crud.createMut.isPending || MODALS[modal.entity].crud.updateMut.isPending}
          onSave={getSaveFn(modal.entity, MODALS[modal.entity].crud)}
          onClose={closeModal}
        />
      )}

      {manageStudentsFor && (
        <ManageStudentsDialog
          classId={manageStudentsFor.id}
          className={manageStudentsFor.name}
          onClose={() => setManageStudentsFor(null)}
        />
      )}
    </div>
  );
}
