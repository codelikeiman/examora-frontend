import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Loader2, KeyRound, User as UserIcon, GraduationCap } from 'lucide-react';
import { useProfile, useUpdateProfile, useUploadAvatar, useChangePassword } from '@/lib/queries';
import { useAuthStore, useCurrentUser } from '@/stores/auth.store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { roleLabel } from '@/lib/utils';

const profileSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Wajib diisi'),
    newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
    confirmPassword: z.string().min(1, 'Wajib diisi'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: 'Konfirmasi password tidak cocok', path: ['confirmPassword'] });
type PasswordForm = z.infer<typeof passwordSchema>;

function getErrorMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? fallback;
}

export default function ProfilePage() {
  const storeUser = useCurrentUser();
  const updateUserInStore = useAuthStore((s) => s.updateUser);
  const { data, isLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const uploadAvatarMutation = useUploadAvatar();
  const changePasswordMutation = useChangePassword();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profile = (data as unknown as { data?: Record<string, unknown> })?.data;

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', phone: '' },
  });

  useEffect(() => {
    if (profile) {
      reset({
        name: (profile.name as string) ?? '',
        email: (profile.email as string) ?? '',
        phone: (profile.phone as string) ?? '',
      });
    }
  }, [profile, reset]);

  const {
    register: registerPw, handleSubmit: handleSubmitPw, reset: resetPw,
    formState: { errors: pwErrors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onSaveProfile = async (formData: ProfileForm) => {
    try {
      const updated = await updateProfileMutation.mutateAsync(formData);
      const safeUser = (updated as unknown as { data?: Record<string, unknown> })?.data ?? formData;
      updateUserInStore({
        name: safeUser.name as string ?? formData.name,
        email: safeUser.email as string ?? formData.email,
        phone: (safeUser.phone as string) ?? formData.phone ?? null,
      });
      toast({ title: '✅ Profil berhasil diperbarui' });
    } catch (err) {
      toast({ title: 'Gagal memperbarui profil', description: getErrorMessage(err, ''), variant: 'destructive' });
    }
  };

  const onChangePassword = async (formData: PasswordForm) => {
    try {
      await changePasswordMutation.mutateAsync({ currentPassword: formData.currentPassword, newPassword: formData.newPassword });
      toast({ title: '✅ Password berhasil diubah' });
      resetPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast({ title: 'Gagal mengubah password', description: getErrorMessage(err, 'Periksa kembali password saat ini'), variant: 'destructive' });
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'File harus berupa gambar', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Ukuran file maksimal 2MB', variant: 'destructive' });
      return;
    }
    try {
      const result = await uploadAvatarMutation.mutateAsync(file);
      const avatarUrl = (result as unknown as { data?: { avatarUrl?: string } })?.data?.avatarUrl ?? null;
      if (avatarUrl) updateUserInStore({ avatarUrl });
      toast({ title: '✅ Foto profil berhasil diperbarui' });
    } catch (err) {
      toast({ title: 'Gagal mengunggah foto', description: getErrorMessage(err, ''), variant: 'destructive' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const initials = (profile?.name as string ?? storeUser?.name ?? 'U').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const avatarUrl = (profile?.avatarUrl as string) ?? storeUser?.avatarUrl ?? undefined;
  const avatarSrc = avatarUrl || undefined;
  const className = profile?.className as string | undefined;
  const role = (profile?.role as string) ?? storeUser?.role ?? '';

  return (
    <div className="max-w-2xl space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profil & Pengaturan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola informasi akun dan foto profil Anda</p>
        </div>
      </div>

      {/* Avatar */}
      <Card>
        <CardContent className="flex items-center gap-5 py-6">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarSrc} alt={profile?.name as string} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={uploadAvatarMutation.isPending}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors disabled:opacity-60"
              title="Ubah foto profil"
            >
              {uploadAvatarMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="space-y-1">
            {isLoading ? <Skeleton className="h-5 w-32" /> : <p className="font-heading font-semibold text-lg">{profile?.name as string}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                <UserIcon className="h-3 w-3" />{roleLabel(role)}
              </span>
              {role === 'SISWA' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  <GraduationCap className="h-3 w-3" />{className ?? 'Belum ada kelas'}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">JPEG/PNG/WEBP, maks. 2MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Profile info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informasi Akun</CardTitle>
          <CardDescription>Nama, email, dan nomor telepon dapat Anda ubah sendiri</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : (
            <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nama Lengkap</Label>
                <Input {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" {...register('email')} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>No. Telepon</Label>
                  <Input {...register('phone')} placeholder="08xxxxxxxxxx" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Username</Label>
                  <Input value={profile?.username as string ?? ''} disabled className="bg-muted/40" />
                  <p className="text-[11px] text-muted-foreground">Username tidak dapat diubah</p>
                </div>
                {role === 'SISWA' && (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Kelas</Label>
                    <Input value={className ?? 'Belum ada kelas'} disabled className="bg-muted/40" />
                    <p className="text-[11px] text-muted-foreground">Hubungi admin untuk pindah kelas</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={!isDirty || updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" />Ubah Password</CardTitle>
          <CardDescription>Gunakan password yang kuat dan tidak digunakan di tempat lain</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitPw(onChangePassword)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Password Saat Ini</Label>
              <Input type="password" {...registerPw('currentPassword')} />
              {pwErrors.currentPassword && <p className="text-xs text-destructive">{pwErrors.currentPassword.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Password Baru</Label>
                <Input type="password" {...registerPw('newPassword')} />
                {pwErrors.newPassword && <p className="text-xs text-destructive">{pwErrors.newPassword.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Konfirmasi Password Baru</Label>
                <Input type="password" {...registerPw('confirmPassword')} />
                {pwErrors.confirmPassword && <p className="text-xs text-destructive">{pwErrors.confirmPassword.message}</p>}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="outline" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ubah Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
