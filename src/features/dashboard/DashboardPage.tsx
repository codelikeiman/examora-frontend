import { useUserRole } from '@/stores/auth.store';
import AdminDashboard from './AdminDashboard';
import GuruDashboard from './GuruDashboard';
import SiswaDashboard from './SiswaDashboard';

/**
 * Each role gets a purpose-built dashboard instead of one generic screen:
 * - ADMIN: user/account approval oversight, school & class management.
 * - GURU: question bank & exam authoring shortcuts, their own exams.
 * - SISWA: exams available to take now, upcoming, and results.
 */
export default function DashboardPage() {
  const role = useUserRole();

  if (role === 'ADMIN') return <AdminDashboard />;
  if (role === 'GURU') return <GuruDashboard />;
  return <SiswaDashboard />;
}
