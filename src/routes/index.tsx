import { Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useIsAuthenticated, useUserRole } from '@/stores/auth.store';
import MainLayout from '@/layouts/MainLayout';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy-loaded pages
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
const VerifyAccountPage = lazy(() => import('@/features/auth/VerifyAccountPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const QuestionBankPage = lazy(() => import('@/features/question-bank/QuestionBankPage'));
const ExamSessionPage = lazy(() => import('@/features/exam-session/ExamSessionPage'));
const AnalyticsPage = lazy(() => import('@/features/analytics/AnalyticsPage'));
const ExamResultsPage = lazy(() => import('@/features/results/ExamResultsPage'));
const SessionReviewPage = lazy(() => import('@/features/results/SessionReviewPage'));
const MyHistoryPage = lazy(() => import('@/features/results/MyHistoryPage'));

// Full exam management pages
const ExamDetailPage = lazy(() => import('@/features/exams/ExamPages').then(m => ({ default: m.ExamDetailPage })));
const ExamFormPage = lazy(() => import('@/features/exams/ExamPages').then(m => ({ default: m.ExamFormPage })));

// Full implementation pages
const UsersPage = lazy(() => import('@/features/users/UsersPage'));
const MasterDataPage = lazy(() => import('@/features/master-data/MasterDataPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));

// Stub pages (expandable to separate files following the same patterns)
const {
  ExamListPage, MyExamsPage,
  NotificationsPage, AuditLogPage, NotFoundPage,
} = {
  ExamListPage: lazy(() => import('@/features/StubPages').then(m => ({ default: m.ExamListPage }))),
  MyExamsPage: lazy(() => import('@/features/StubPages').then(m => ({ default: m.MyExamsPage }))),
  NotificationsPage: lazy(() => import('@/features/StubPages').then(m => ({ default: m.NotificationsPage }))),
  AuditLogPage: lazy(() => import('@/features/StubPages').then(m => ({ default: m.AuditLogPage }))),
  NotFoundPage: lazy(() => import('@/features/StubPages').then(m => ({ default: m.default }))),
};

function PageLoader() {
  return (
    <div className="space-y-4 p-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-4 gap-4 mt-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuth = useIsAuthenticated();
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const role = useUserRole();
  return roles.includes(role) ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const isAuth = useIsAuthenticated();
  return isAuth ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

// ── Role groups (3-role model: ADMIN, GURU, SISWA) ─────────────────────────
// Soal (questions) and ujian (exams) are authored by GURU only — ADMIN is
// intentionally excluded from both, per product requirement.
const QUESTION_MANAGERS = ['GURU'];
const EXAM_EDITORS = ['GURU'];
const EXAM_VIEWERS = ['ADMIN', 'GURU'];
const ANALYTICS_VIEWERS = ['ADMIN', 'GURU'];
const USER_MANAGERS = ['ADMIN'];
const MASTER_DATA_MANAGERS = ['ADMIN'];

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
        <Route path="/verify" element={<PublicOnly><VerifyAccountPage /></PublicOnly>} />

        {/* Exam taking - full screen, no sidebar */}
        <Route path="/exam/:examId/take" element={
          <RequireAuth>
            <RequireRole roles={['SISWA']}>
              <ExamSessionPage />
            </RequireRole>
          </RequireAuth>
        } />

        {/* Main app */}
        <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Questions — GURU only (bank soal is not accessible to ADMIN) */}
          <Route path="/questions" element={<RequireRole roles={QUESTION_MANAGERS}><QuestionBankPage /></RequireRole>} />

          {/* Exams - staff view. ADMIN can view but not create/edit. */}
          <Route path="/exams" element={<RequireRole roles={EXAM_VIEWERS}><ExamListPage /></RequireRole>} />
          <Route path="/exams/new" element={<RequireRole roles={EXAM_EDITORS}><ExamFormPage /></RequireRole>} />
          <Route path="/exams/:id" element={<RequireRole roles={EXAM_VIEWERS}><ExamDetailPage /></RequireRole>} />
          <Route path="/exams/:id/edit" element={<RequireRole roles={EXAM_EDITORS}><ExamFormPage /></RequireRole>} />

          {/* Student exam view */}
          <Route path="/my-exams" element={<RequireRole roles={['SISWA']}><MyExamsPage /></RequireRole>} />

          {/* Student exam history — every attempt across every exam */}
          <Route path="/my-history" element={<RequireRole roles={['SISWA']}><MyHistoryPage /></RequireRole>} />

          {/* Hasil Ujian & Ranking — staff view */}
          <Route path="/exams/:examId/results" element={<RequireRole roles={ANALYTICS_VIEWERS}><ExamResultsPage /></RequireRole>} />

          {/* Analytics */}
          <Route path="/analytics" element={<RequireRole roles={ANALYTICS_VIEWERS}><ExamListPage forAnalytics /></RequireRole>} />
          <Route path="/analytics/:examId" element={<RequireRole roles={ANALYTICS_VIEWERS}><AnalyticsPage /></RequireRole>} />

          {/* Session review — detail jawaban satu sesi. Siswa hanya bisa lihat sesinya sendiri (dicek di backend); guru/admin bisa lihat sesi siapa pun. */}
          <Route path="/sessions/:sessionId" element={<SessionReviewPage />} />

          {/* Users (incl. account approval) */}
          <Route path="/users" element={<RequireRole roles={USER_MANAGERS}><UsersPage /></RequireRole>} />

          {/* Master data */}
          <Route path="/master" element={<RequireRole roles={MASTER_DATA_MANAGERS}><MasterDataPage /></RequireRole>} />

          {/* Profile & Settings — available to every role */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* Notifications */}
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Audit */}
          <Route path="/audit" element={<RequireRole roles={USER_MANAGERS}><AuditLogPage /></RequireRole>} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
