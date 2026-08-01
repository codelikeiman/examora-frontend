import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, Download, TrendingUp, AlertCircle, CheckCircle2, FileDown } from 'lucide-react';
import { useExamAnalytics } from '@/lib/queries';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';

interface Analytics {
  examTitle: string;
  totalParticipants: number;
  submittedCount: number;
  averageScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  standardDeviation: number;
  distribution: Array<{ range: string; count: number; percent: number }>;
  itemAnalysis: Array<{
    questionNo: number;
    questionContent: string;
    difficultyIndex: number;
    difficultyLabel: string;
    discriminationIndex: number;
    discriminationLabel: string;
    totalAnswered: number;
    totalCorrect: number;
  }>;
  recommendations: string[];
}

const DIFF_COLOR: Record<string, string> = {
  'Sangat Mudah': '#16a34a', Mudah: '#22c55e', Sedang: '#f59e0b', Sulit: '#ef4444', 'Sangat Sulit': '#7f1d1d',
};
const DISC_COLOR: Record<string, string> = {
  'Sangat Baik': '#16a34a', Baik: '#22c55e', Cukup: '#f59e0b', Buruk: '#ef4444',
};

export default function AnalyticsPage() {
  const { examId } = useParams<{ examId: string }>();
  const { data: rawData, isLoading } = useExamAnalytics(examId ?? '');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const analytics = (rawData as unknown as { data?: Analytics })?.data;

  const handleExport = async (type: 'pdf' | 'excel') => {
    setExporting(type);
    try {
      const blob = await apiClient.downloadBlob(`/analytics/exam/${examId}/export/${type}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analitik-ujian-${examId}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Gagal mengekspor', variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  if (!analytics) return <div className="text-center py-16 text-muted-foreground">Data analitik tidak ditemukan.</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analitik Ujian</h1>
          <p className="text-sm text-muted-foreground">{analytics.examTitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('excel')} disabled={!!exporting}>
            <Download className="h-4 w-4" />{exporting === 'excel' ? 'Mengekspor...' : 'Excel'}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('pdf')} disabled={!!exporting}>
            <FileDown className="h-4 w-4" />{exporting === 'pdf' ? 'Mengekspor...' : 'PDF'}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Peserta', value: analytics.totalParticipants },
          { label: 'Rata-rata', value: analytics.averageScore.toFixed(1), color: analytics.averageScore >= 70 ? 'text-emerald-500' : 'text-red-500' },
          { label: 'Median', value: analytics.medianScore.toFixed(1) },
          { label: 'Kelulusan', value: `${analytics.passRate.toFixed(1)}%`, color: analytics.passRate >= 75 ? 'text-emerald-500' : 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card text-center">
            <p className={cn('text-3xl font-heading font-bold', color ?? 'text-foreground')}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Score distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Distribusi Nilai</CardTitle>
            <CardDescription>Sebaran nilai peserta ujian</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.distribution} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v} siswa`]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {analytics.distribution.map((entry, i) => {
                    const rangeStart = parseInt(entry.range.split('–')[0]);
                    return <Cell key={i} fill={rangeStart >= 70 ? '#16a34a' : rangeStart >= 50 ? '#f59e0b' : '#ef4444'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Difficulty scatter */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Analisis Butir Soal</CardTitle>
            <CardDescription>P (kesulitan) vs D (daya pembeda)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="difficultyIndex" type="number" domain={[0, 1]} name="P" tick={{ fontSize: 10 }} label={{ value: 'P (Kesulitan)', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                <YAxis dataKey="discriminationIndex" type="number" domain={[-0.5, 1]} name="D" tick={{ fontSize: 10 }} />
                <ReferenceLine y={0.3} stroke="#16a34a" strokeDasharray="4 2" label={{ value: 'D≥0.3 Baik', position: 'right', fontSize: 9 }} />
                <ReferenceLine x={0.3} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Sulit', position: 'top', fontSize: 9 }} />
                <ReferenceLine x={0.7} stroke="#16a34a" strokeDasharray="4 2" label={{ value: 'Mudah', position: 'top', fontSize: 9 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: number) => v.toFixed(3)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Scatter data={analytics.itemAnalysis} fill="hsl(214 51% 24%)" opacity={0.8} />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Item analysis table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tabel Analisis Butir Soal</CardTitle>
          <CardDescription>Tingkat kesulitan (P) dan daya pembeda (D) tiap soal</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-y">
                <tr>
                  {['No', 'Soal (ringkasan)', 'P', 'Kategori', 'D', 'Kategori', '% Benar'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {analytics.itemAnalysis.map((item) => (
                  <tr key={item.questionNo} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{item.questionNo}</td>
                    <td className="px-4 py-2.5 max-w-[200px]">
                      <p className="line-clamp-1 text-xs">{item.questionContent}</p>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{item.difficultyIndex.toFixed(2)}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium" style={{ color: DIFF_COLOR[item.difficultyLabel] }}>{item.difficultyLabel}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{item.discriminationIndex.toFixed(2)}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium" style={{ color: DISC_COLOR[item.discriminationLabel] }}>{item.discriminationLabel}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {item.totalAnswered > 0 ? `${((item.totalCorrect / item.totalAnswered) * 100).toFixed(0)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {analytics.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" />Rekomendasi</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analytics.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
