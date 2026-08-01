import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, UserCheck, UserX, KeyRound, Pencil, X, Clock, GraduationCap, Trash2, Copy, ShieldCheck } from 'lucide-react';
import {
  useUsers, useCreateUser, useUpdateUser, useRoleCounts,
  useGenerateVerificationCode, useRejectUser, useDeactivateUser, useClasses, useSetStudentClass,
  usePermanentDeleteUser,
} from '@/lib/queries';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { useCurrentUser } from '@/stores/auth.store';
import { roleLabel, formatDateTime, accountStatusLabel, accountStatusColor } from '@/lib/utils';

const ROLES = ['ADMIN', 'GURU', 'SISWA'];
const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-orange-100 text-orange-700 border-orange-200',
  GURU: 'bg-blue-100 text-blue-700 border-blue-200',
  SISWA: 'bg-green-100 text-green-700 border-green-200',
};
const STATUS_TABS = [
  { value: '', label: 'Semua' },
  { value: 'PENDING', label: 'Menunggu Persetujuan' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'REJECTED', label: 'Ditolak' },
];

const userSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  username: z.string().min(3, 'Username minimal 3 karakter').regex(/^[a-zA-Z0-9_]+$/, 'Hanya huruf, angka, underscore'),
  password: z.string().min(8, 'Password minimal 8 karakter').optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'GURU', 'SISWA']),
  phone: z.string().optional(),
});
type UserForm = z.infer<typeof userSchema>;

interface UserModalProps {
  user?: Record<string, unknown> | null;
  onClose: () => void;
}

function UserModal({ user, onClose }: UserModalProps) {
  const isEdit = !!user;
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: (user?.name as string) ?? '',
      email: (user?.email as string) ?? '',
      username: (user?.username as string) ?? '',
      role: (user?.role as UserForm['role']) ?? 'SISWA',
      phone: (user?.phone as string) ?? '',
      password: '',
    },
  });

  const onSubmit = async (data: UserForm) => {
    try {
      const payload = { ...data, password: data.password || undefined };
      if (isEdit && user?.id) {
        const { password: _password, role: _role, ...updateData } = payload;
        await updateMutation.mutateAsync({ id: user.id as string, ...updateData });
        toast({ title: '✅ Pengguna berhasil diperbarui' });
      } else {
        if (!data.password) { toast({ title: 'Password wajib diisi', variant: 'destructive' }); return; }
        // Admin-created accounts are approved immediately (no pending gate).
        await createMutation.mutateAsync(payload);
        toast({ title: '✅ Pengguna berhasil dibuat' });
      }
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast({ title: 'Gagal menyimpan', description: msg, variant: 'destructive' });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nama Lengkap <span className="text-destructive">*</span></Label>
            <Input {...register('name')} placeholder="Nama lengkap" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" {...register('email')} placeholder="email@sekolah.id" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Username <span className="text-destructive">*</span></Label>
              <Input {...register('username')} placeholder="username" disabled={isEdit} />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Peran <span className="text-destructive">*</span></Label>
              <Select value={watch('role')} onValueChange={(v) => setValue('role', v as UserForm['role'])} disabled={isEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}</SelectContent>
              </Select>
              {isEdit && <p className="text-[11px] text-muted-foreground">Peran tidak dapat diubah setelah akun dibuat.</p>}
            </div>
            <div className="space-y-1.5">
              <Label>No. Telepon</Label>
              <Input {...register('phone')} placeholder="08xxxxxxxxx" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{isEdit ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}</Label>
            <Input type="password" {...register('password')} placeholder={isEdit ? '••••••••' : 'Min. 8 karakter'} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {isEdit ? 'Simpan Perubahan' : 'Buat Pengguna'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const rejectMutation = useRejectUser();
  const [reason, setReason] = useState('');

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync({ id: userId, reason: reason || undefined });
      toast({ title: '✅ Akun berhasil ditolak' });
      onClose();
    } catch {
      toast({ title: 'Gagal menolak akun', variant: 'destructive' });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Tolak Pendaftaran Akun</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Alasan penolakan (opsional)</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Contoh: Data tidak sesuai / bukan siswa aktif" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
            {rejectMutation.isPending && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            Tolak Akun
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VerificationCodeDialog({ user, onClose }: { user: Record<string, unknown>; onClose: () => void }) {
  const generateMutation = useGenerateVerificationCode();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    try {
      const res = await generateMutation.mutateAsync(user.id as string);
      const generatedCode = (res as unknown as { data?: { code?: string } })?.data?.code ?? null;
      setCode(generatedCode);
      toast({ title: '✅ Kode verifikasi berhasil dibuat' });
    } catch {
      toast({ title: 'Gagal membuat kode verifikasi', variant: 'destructive' });
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable — ignore */
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Kode Verifikasi Akun
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Buat kode verifikasi 6 digit untuk <span className="font-medium text-foreground">{user.name as string}</span>.
            Berikan kode ini secara langsung (WA, telepon, dsb) kepada pengguna agar mereka dapat memasukkannya di
            halaman verifikasi akun dan mengaktifkan akunnya.
          </p>

          {code ? (
            <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center space-y-2">
              <p className="text-xs text-muted-foreground">Kode Verifikasi</p>
              <p className="text-3xl font-mono font-bold tracking-[0.3em] text-primary">{code}</p>
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Tersalin!' : 'Salin Kode'}
              </Button>
              <p className="text-[11px] text-muted-foreground pt-1">
                Kode berlaku 24 jam. Anda dapat membuat kode baru kapan saja jika diperlukan.
              </p>
            </div>
          ) : (
            <Button type="button" className="w-full gap-2" onClick={handleGenerate} disabled={generateMutation.isPending}>
              {generateMutation.isPending && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              Buat Kode Verifikasi
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {code ? 'Selesai' : 'Batal'}
          </Button>
          {code && (
            <Button type="button" variant="ghost" onClick={handleGenerate} disabled={generateMutation.isPending} className="gap-1.5">
              Buat Kode Baru
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeClassDialog({ student, onClose }: { student: Record<string, unknown>; onClose: () => void }) {
  const { data: classesData, isLoading } = useClasses();
  const setClassMutation = useSetStudentClass();
  const classes = (classesData as unknown as { data?: Array<{ id: string; name: string; gradeLevel: number | null }> })?.data ?? [];
  const [selected, setSelected] = useState<string>((student.classId as string) ?? '__none__');

  const handleSave = async () => {
    try {
      await setClassMutation.mutateAsync({ userId: student.id as string, classId: selected === '__none__' ? null : selected });
      toast({ title: '✅ Kelas siswa berhasil diperbarui' });
      onClose();
    } catch {
      toast({ title: 'Gagal memperbarui kelas', variant: 'destructive' });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Pindah Kelas — {student.name as string}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Kelas</Label>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Tidak ada kelas</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}{c.gradeLevel ? ` (Kelas ${c.gradeLevel})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-[11px] text-muted-foreground">
            Memindahkan siswa ke kelas baru akan otomatis mengeluarkannya dari kelas sebelumnya.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={setClassMutation.isPending}>
            {setClassMutation.isPending && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const currentUser = useCurrentUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<Record<string, unknown> | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [verifyingUser, setVerifyingUser] = useState<Record<string, unknown> | null>(null);
  const [changingClassFor, setChangingClassFor] = useState<Record<string, unknown> | null>(null);

  const { data, isLoading } = useUsers({
    page, limit: 20, search: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined,
  });
  const { data: countData } = useRoleCounts();
  const deactivateMutation = useDeactivateUser();
  const permanentDeleteMutation = usePermanentDeleteUser();

  const users = (data as unknown as { data?: Record<string, unknown>[] })?.data ?? [];
  const meta = (data as { meta?: { total: number; totalPages: number } })?.meta;
  const counts = (countData as unknown as { data?: Record<string, number> })?.data ?? {};

  const handleDeactivate = async (id: string, isActive: boolean) => {
    try {
      await deactivateMutation.mutateAsync(id);
      toast({ title: `✅ Pengguna berhasil ${isActive ? 'dinonaktifkan' : 'diaktifkan'}` });
    } catch { toast({ title: 'Gagal mengubah status', variant: 'destructive' }); }
  };

  const handleResetPassword = async (id: string) => {
    try {
      await apiClient.post(`/users/${id}/reset-password`, { password: 'Password@123' });
      toast({ title: '✅ Password direset ke: Password@123' });
    } catch { toast({ title: 'Gagal reset password', variant: 'destructive' }); }
  };

  const handlePermanentDelete = async (id: string, name: string) => {
    try {
      await permanentDeleteMutation.mutateAsync(id);
      toast({ title: `✅ Akun "${name}" berhasil dihapus permanen` });
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast({
        title: 'Tidak bisa menghapus akun ini',
        description: msg ?? 'Terjadi kesalahan saat menghapus akun.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Pengguna</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Total {meta?.total ?? 0} pengguna terdaftar</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditUser(null); setShowModal(true); }}>
          <Plus className="h-4 w-4" />Tambah Pengguna
        </Button>
      </div>

      {/* Status tabs — approval workflow */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setStatusFilter(t.value); setPage(1); }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${statusFilter === t.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
          >
            {t.value === 'PENDING' && <Clock className="h-3.5 w-3.5" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Role summary */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button key={r} onClick={() => { setRoleFilter(roleFilter === r ? '' : r); setPage(1); }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${roleFilter === r ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/50'}`}>
            {roleLabel(r)} <span className="font-mono">{counts[r] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari nama, email, username..." className="pl-8" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-2 px-4">
          <p className="text-xs text-muted-foreground">{meta ? `${meta.total} pengguna` : 'Memuat...'}</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-y">
                <tr>
                  {['Pengguna', 'Peran', 'Kelas', 'Status Akun', 'Aktif', 'Terakhir Login', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td></tr>
                )) : users.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">Tidak ada pengguna ditemukan</td></tr>
                ) : users.map((u) => {
                  const status = (u.status as string) ?? 'APPROVED';
                  const isPendingUser = status === 'PENDING';
                  return (
                  <tr key={u.id as string} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">{(u.name as string).slice(0, 1).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{u.name as string}</p>
                          <p className="text-xs text-muted-foreground">{u.email as string} · @{u.username as string}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role as string] ?? ''}`}>
                        {roleLabel(u.role as string)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'SISWA' ? (
                        <button
                          type="button"
                          onClick={() => setChangingClassFor(u)}
                          className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                          title="Ubah kelas siswa"
                        >
                          <GraduationCap className="h-3 w-3" />
                          {(u.className as string) ?? 'Belum ada kelas'}
                          <Pencil className="h-2.5 w-2.5 opacity-60" />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${accountStatusColor(status)}`}>
                        {accountStatusLabel(status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        {u.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.lastLoginAt ? formatDateTime(u.lastLoginAt as string) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isPendingUser ? (
                          <>
                            <Button size="sm" className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setVerifyingUser(u)}>
                              <ShieldCheck className="h-3.5 w-3.5" />Beri Kode
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive hover:text-destructive" onClick={() => setRejectingId(u.id as string)}>
                              <X className="h-3.5 w-3.5" />Tolak
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit"
                              onClick={() => { setEditUser(u); setShowModal(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset Password">
                                  <KeyRound className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reset Password?</AlertDialogTitle>
                                  <AlertDialogDescription>Password akan direset ke <strong>Password@123</strong>. Pengguna harus ganti password saat login berikutnya.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleResetPassword(u.id as string)}>Reset Password</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            {currentUser?.id !== u.id && (
                              <>
                                <Button variant="ghost" size="icon" className={`h-8 w-8 ${u.isActive ? 'text-destructive hover:text-destructive hover:bg-destructive/10' : 'text-emerald-600 hover:text-emerald-700'}`}
                                  title={u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                  onClick={() => handleDeactivate(u.id as string, u.isActive as boolean)}>
                                  {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Hapus Permanen">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Hapus akun "{u.name as string}" secara permanen?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tindakan ini <strong>tidak bisa dibatalkan</strong>. Akun beserta datanya (jika tidak
                                        ada riwayat ujian/soal yang terkait) akan dihapus sepenuhnya dari sistem.
                                        Jika akun ini memiliki riwayat penting (pernah membuat soal, ujian, atau mengerjakan
                                        ujian), sistem akan menolak dan menyarankan menonaktifkan akun saja.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Batal</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive hover:bg-destructive/90"
                                        onClick={() => handlePermanentDelete(u.id as string, u.name as string)}
                                      >
                                        Ya, Hapus Permanen
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">Halaman {page} dari {meta.totalPages}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && <UserModal user={editUser} onClose={() => { setShowModal(false); setEditUser(null); }} />}
      {rejectingId && <RejectDialog userId={rejectingId} onClose={() => setRejectingId(null)} />}
      {verifyingUser && <VerificationCodeDialog user={verifyingUser} onClose={() => setVerifyingUser(null)} />}
      {changingClassFor && <ChangeClassDialog student={changingClassFor} onClose={() => setChangingClassFor(null)} />}
    </div>
  );
}
