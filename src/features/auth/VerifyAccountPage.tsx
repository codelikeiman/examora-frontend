import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, GraduationCap, CheckCircle2 } from 'lucide-react';
import { useVerifyAccount } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const schema = z.object({
  identifier: z.string().min(1, 'Email atau username wajib diisi'),
  code: z
    .string()
    .length(6, 'Kode verifikasi harus 6 digit')
    .regex(/^\d{6}$/, 'Kode verifikasi harus berupa 6 angka'),
});
type FormData = z.infer<typeof schema>;

export default function VerifyAccountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const verifyMutation = useVerifyAccount();
  const [verified, setVerified] = useState(false);

  // If the person arrived here right after registering, prefill their identifier.
  const prefillIdentifier = (location.state as { identifier?: string } | null)?.identifier ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { identifier: prefillIdentifier } });

  const onSubmit = async (data: FormData) => {
    try {
      await verifyMutation.mutateAsync(data);
      setVerified(true);
    } catch {
      /* error handled via mutation.error below */
    }
  };

  const errorMessage = verifyMutation.error
    ? ((verifyMutation.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message ?? 'Verifikasi gagal. Periksa kembali kode Anda.')
    : null;

  if (verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-600 via-navy-700 to-navy-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-heading font-bold">Akun Terverifikasi</h2>
              <p className="text-sm text-muted-foreground">
                Akun Anda berhasil diverifikasi. Anda sekarang dapat masuk menggunakan email/username dan password Anda.
              </p>
            </div>
            <Button className="w-full" onClick={() => navigate('/login', { replace: true })}>
              Masuk Sekarang
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-600 via-navy-700 to-navy-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.05)_0%,transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-sm space-y-6 relative">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-1">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-white">Examora CBT</h1>
          <p className="text-navy-200 text-sm">Verifikasi Akun</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Masukkan Kode Verifikasi
            </CardTitle>
            <CardDescription>
              Masukkan email/username Anda dan kode 6 digit yang diberikan oleh admin untuk mengaktifkan akun.
            </CardDescription>
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
                <Label htmlFor="code">Kode Verifikasi (6 digit)</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  className={`text-center text-2xl font-mono tracking-[0.5em] ${errors.code ? 'border-destructive' : ''}`}
                  {...register('code')}
                />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>

              <Button type="submit" className="w-full gap-2" disabled={verifyMutation.isPending}>
                {verifyMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {verifyMutation.isPending ? 'Memverifikasi...' : 'Verifikasi Akun'}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Belum mendapatkan kode? Hubungi admin sekolah Anda untuk mendapatkan kode verifikasi 6 digit.
              </p>

              <p className="text-center text-sm text-muted-foreground">
                Sudah verifikasi?{' '}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Masuk di sini
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
