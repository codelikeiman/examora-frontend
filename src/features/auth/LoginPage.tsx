import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { useLogin } from '@/lib/queries';
import { useIsAuthenticated } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const schema = z.object({
  identifier: z.string().min(1, 'Email atau username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await loginMutation.mutateAsync(data);
      navigate('/dashboard', { replace: true });
    } catch { /* error handled via mutation.error */ }
  };

  const errorMessage = loginMutation.error
    ? (loginMutation.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Login gagal. Periksa kembali kredensial Anda.'
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-600 via-navy-700 to-navy-800 flex items-center justify-center p-4">
      {/* Decorative background dots */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.05)_0%,transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-sm space-y-6 relative">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-1">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-white">Examora CBT</h1>
          <p className="text-navy-200 text-sm">Platform Ujian Berbasis Komputer</p>
        </div>

        {/* Login card */}
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-heading">Masuk ke Akun</CardTitle>
            <CardDescription>Gunakan email, username, atau NIS Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="identifier">Email / Username</Label>
                <Input
                  id="identifier"
                  placeholder="email@sekolah.id atau username"
                  autoComplete="username"
                  {...register('identifier')}
                  className={errors.identifier ? 'border-destructive' : ''}
                />
                {errors.identifier && <p className="text-xs text-destructive">{errors.identifier.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
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

              <Button type="submit" className="w-full gap-2" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {loginMutation.isPending ? 'Memverifikasi...' : 'Masuk'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Belum punya akun?{' '}
                <Link to="/register" className="font-medium text-primary hover:underline">
                  Daftar di sini
                </Link>
              </p>
              <p className="text-center text-xs text-muted-foreground">
                Sudah daftar tapi belum bisa masuk?{' '}
                <Link to="/verify" className="font-medium text-primary hover:underline">
                  Verifikasi akun dengan kode
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-navy-300">
          © {new Date().getFullYear()} Examora CBT · Enterprise Edition
        </p>
      </div>
    </div>
  );
}
