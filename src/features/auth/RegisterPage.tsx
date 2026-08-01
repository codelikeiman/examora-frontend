import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, GraduationCap, CheckCircle2 } from 'lucide-react';
import { useRegister, usePublicClasses } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z
  .object({
    name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
    email: z.string().email('Format email tidak valid'),
    username: z
      .string()
      .min(3, 'Username minimal 3 karakter')
      .max(40)
      .regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore'),
    role: z.enum(['GURU', 'SISWA'], { required_error: 'Pilih peran Anda' }),
    phone: z.string().optional(),
    classId: z.string().optional(),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    confirmPassword: z.string().min(1, 'Wajib diisi'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedIdentifier, setSubmittedIdentifier] = useState('');

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: 'SISWA' } });

  const selectedRole = watch('role');
  const { data: classesData, isLoading: loadingClasses } = usePublicClasses();
  const classes = (classesData as unknown as { data?: Array<{ id: string; name: string; gradeLevel: number | null }> })?.data ?? [];

  const onSubmit = async (data: FormData) => {
    try {
      const { confirmPassword: _confirmPassword, ...payload } = data;
      await registerMutation.mutateAsync(payload);
      setSubmittedIdentifier(data.username || data.email);
      setSubmitted(true);
    } catch {
      /* error handled via mutation.error below */
    }
  };

  const errorMessage = registerMutation.error
    ? ((registerMutation.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message ?? 'Registrasi gagal. Silakan coba lagi.')
    : null;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-600 via-navy-700 to-navy-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-heading font-bold">Registrasi Berhasil</h2>
              <p className="text-sm text-muted-foreground">
                Akun Anda telah dibuat. Hubungi admin untuk mendapatkan{' '}
                <span className="font-medium">kode verifikasi 6 digit</span>, lalu masukkan kode tersebut di halaman
                verifikasi akun agar akun Anda dapat digunakan untuk masuk.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => navigate('/verify', { replace: true, state: { identifier: submittedIdentifier } })}
            >
              Lanjut ke Verifikasi Akun
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/login', { replace: true })}>
              Kembali ke Halaman Masuk
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-600 via-navy-700 to-navy-800 flex items-center justify-center p-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.05)_0%,transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-sm space-y-6 relative">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-1">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-white">Examora CBT</h1>
          <p className="text-navy-200 text-sm">Daftar Akun Baru</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-heading">Buat Akun</CardTitle>
            <CardDescription>Akun aktif setelah Anda memasukkan kode verifikasi dari admin</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input id="name" placeholder="Nama lengkap Anda" {...register('name')} className={errors.name ? 'border-destructive' : ''} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="email@contoh.com" {...register('email')} className={errors.email ? 'border-destructive' : ''} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="username" {...register('username')} className={errors.username ? 'border-destructive' : ''} />
                {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">No. HP (opsional)</Label>
                <Input id="phone" placeholder="08xxxxxxxxxx" {...register('phone')} />
              </div>

              <div className="space-y-1.5">
                <Label>Daftar Sebagai</Label>
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Pilih peran" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SISWA">Siswa</SelectItem>
                        <SelectItem value="GURU">Guru</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
              </div>

              {selectedRole === 'SISWA' && (
                <div className="space-y-1.5">
                  <Label>Kelas</Label>
                  <Controller
                    control={control}
                    name="classId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={loadingClasses}>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingClasses ? 'Memuat kelas...' : 'Pilih kelas (opsional)'} />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.length === 0 ? (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">Belum ada kelas tersedia</div>
                          ) : classes.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}{c.gradeLevel ? ` (Kelas ${c.gradeLevel})` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Jika kelas Anda belum tersedia atau salah pilih, admin dapat mengaturnya nanti.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 8 karakter"
                    {...register('password')}
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ulangi password"
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'border-destructive' : ''}
                />
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
              </div>

              <Button type="submit" className="w-full gap-2" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {registerMutation.isPending ? 'Mendaftar...' : 'Daftar'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Sudah punya akun?{' '}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Masuk di sini
                </Link>
              </p>
              <p className="text-center text-xs text-muted-foreground">
                Sudah punya kode verifikasi?{' '}
                <Link to="/verify" className="font-medium text-primary hover:underline">
                  Verifikasi akun
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
