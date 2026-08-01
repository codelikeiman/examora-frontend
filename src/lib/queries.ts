import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from './api-client';
import { useAuthStore } from '@/stores/auth.store';

// ── Keys ─────────────────────────────────────────────────────────────────────
export const qk = {
  me: ['me'] as const,
  users: (p?: object) => ['users', p] as const,
  user: (id: string) => ['users', id] as const,
  roleCounts: ['role-counts'] as const,
  subjects: (p?: object) => ['subjects', p] as const,
  schools: (p?: object) => ['schools', p] as const,
  classes: (p?: object) => ['classes', p] as const,
  publicClasses: ['public-classes'] as const,
  profile: ['profile'] as const,
  questions: (p?: object) => ['questions', p] as const,
  question: (id: string) => ['questions', id] as const,
  topics: (subjectId: string) => ['topics', subjectId] as const,
  exams: (p?: object) => ['exams', p] as const,
  exam: (id: string) => ['exams', id] as const,
  examPool: (id: string) => ['exam-pool', id] as const,
  examTokens: (id: string) => ['exam-tokens', id] as const,
  session: (id: string) => ['session', id] as const,
  examResults: (examId: string) => ['exam-results', examId] as const,
  mySession: (examId: string) => ['my-session', examId] as const,
  myHistory: ['my-history'] as const,
  analytics: (examId: string) => ['analytics', examId] as const,
  notifications: (p?: object) => ['notifications', p] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  auditLogs: (p?: object) => ['audit-logs', p] as const,
};

type PaginatedResponse<T> = { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } };

// ── Auth ─────────────────────────────────────────────────────────────────────
export const useLogin = () => {
  const { login } = useAuthStore();
  return useMutation({
    mutationFn: (body: { identifier: string; password: string }) =>
      apiClient.post<{ user: Record<string, unknown>; accessToken: string }>('/auth/login', body),
    onSuccess: (res) => {
      login(res.data.user as never, res.data.accessToken);
    },
  });
};

export const useLogout = () => {
  const { logout } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/auth/logout'),
    onSuccess: () => {
      logout();
      qc.clear();
    },
  });
};

/** Public self-registration — no auth needed. Account starts PENDING until an admin issues a verification code. */
export const useRegister = () =>
  useMutation({
    mutationFn: (body: { name: string; email: string; username: string; password: string; role: 'GURU' | 'SISWA'; phone?: string }) =>
      apiClient.post<{ user: Record<string, unknown> }>('/auth/register', body),
  });

/** Public — user redeems the 6-digit code an admin gave them to activate their account. */
export const useVerifyAccount = () =>
  useMutation({
    mutationFn: (body: { identifier: string; code: string }) =>
      apiClient.post<{ user: Record<string, unknown> }>('/auth/verify', body),
  });

// ── Users ─────────────────────────────────────────────────────────────────────
export const useUsers = (params?: object) =>
  useQuery({ queryKey: qk.users(params), queryFn: () => apiClient.get<PaginatedResponse<Record<string, unknown>>>('/users', params) });

export const useUser = (id: string) =>
  useQuery({ queryKey: qk.user(id), queryFn: () => apiClient.get<Record<string, unknown>>(`/users/${id}`), enabled: !!id });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: object) => apiClient.post('/users', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & object) => apiClient.patch(`/users/${id}`, body),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['users'] }); qc.invalidateQueries({ queryKey: qk.user(v.id) }); },
  });
};

export const useDeactivateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

/** Permanently deletes a user account (distinct from deactivate). Backend refuses if the account has dependent records. */
export const usePermanentDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}/permanent`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users-pending-count'] });
    },
  });
};

/** Admin generates a fresh 6-digit verification code for a pending user; returns the code to display/share. */
export const useGenerateVerificationCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ user: Record<string, unknown>; code: string }>(`/users/${id}/generate-verification-code`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users-pending-count'] });
    },
  });
};

export const useRejectUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => apiClient.post(`/users/${id}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users-pending-count'] });
    },
  });
};

export const usePendingUserCount = () =>
  useQuery({
    queryKey: ['users-pending-count'],
    queryFn: () => apiClient.get<{ count: number }>('/users/pending-count'),
    refetchInterval: 30_000,
  });

export const useRoleCounts = () =>
  useQuery({ queryKey: qk.roleCounts, queryFn: () => apiClient.get<Record<string, number>>('/users/role-counts') });

// ── Subjects ──────────────────────────────────────────────────────────────────
export const useSubjects = (params?: object) =>
  useQuery({ queryKey: qk.subjects(params), queryFn: () => apiClient.get<Record<string, unknown>[]>('/subjects', { all: 'true', ...params }) });

// ── Classes ───────────────────────────────────────────────────────────────────
/** Full class list (not paginated) — used to populate class-picker dropdowns, e.g. when creating an exam. */
export const useClasses = (params?: object) =>
  useQuery({
    queryKey: qk.classes(params),
    queryFn: () => apiClient.get<PaginatedResponse<Record<string, unknown>>>('/classes', { limit: 100, ...params }),
  });

/** No-auth class listing for the public registration form. */
export const usePublicClasses = () =>
  useQuery({
    queryKey: qk.publicClasses,
    queryFn: () => apiClient.get<Array<{ id: string; name: string; gradeLevel: number | null }>>('/public/classes'),
  });

/** Admin action: assign/move/unassign a student's class from anywhere (Users page, class roster, etc). */
export const useSetStudentClass = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, classId }: { userId: string; classId: string | null }) =>
      apiClient.post(`/users/${userId}/set-class`, { classId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
    },
  });
};

// ── Profile ───────────────────────────────────────────────────────────────────
export const useProfile = () =>
  useQuery({ queryKey: qk.profile, queryFn: () => apiClient.get<Record<string, unknown>>('/auth/me') });

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; email?: string; phone?: string }) => apiClient.patch('/auth/me', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profile }),
  });
};

export const useUploadAvatar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return apiClient.upload<Record<string, unknown>>('/auth/me/avatar', formData);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profile }),
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      apiClient.patch('/auth/change-password', body),
  });

// ── Questions ─────────────────────────────────────────────────────────────────
export const useQuestions = (params?: object) =>
  useQuery({ queryKey: qk.questions(params), queryFn: () => apiClient.get<PaginatedResponse<Record<string, unknown>>>('/questions', params) });

export const useQuestion = (id: string) =>
  useQuery({ queryKey: qk.question(id), queryFn: () => apiClient.get<Record<string, unknown>>(`/questions/${id}`), enabled: !!id });

export const useCreateQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: object) => apiClient.post('/questions', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });
};

export const useUpdateQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & object) => apiClient.patch(`/questions/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });
};

export const useDeleteQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ archived: boolean }>(`/questions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });
};

export const useImportQuestions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData(); fd.append('file', file);
      return apiClient.upload<{ created: number; skipped: number; errors: Array<{ row: number; message: string }> }>('/questions/import', fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });
};

export const useTopics = (subjectId: string) =>
  useQuery({ queryKey: qk.topics(subjectId), queryFn: () => apiClient.get<string[]>(`/questions/topics/${subjectId}`), enabled: !!subjectId });

// ── Exams ─────────────────────────────────────────────────────────────────────
export const useExams = (params?: object) =>
  useQuery({ queryKey: qk.exams(params), queryFn: () => apiClient.get<PaginatedResponse<Record<string, unknown>>>('/exams', params) });

export const useExam = (id: string, opts?: Partial<UseQueryOptions>) =>
  useQuery({ queryKey: qk.exam(id), queryFn: () => apiClient.get<Record<string, unknown>>(`/exams/${id}`), enabled: !!id, ...opts } as UseQueryOptions);

export const useCreateExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: object) => apiClient.post('/exams', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });
};

export const useUpdateExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & object) => apiClient.patch(`/exams/${id}`, body),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['exams'] }); qc.invalidateQueries({ queryKey: qk.exam(v.id) }); },
  });
};

export const usePublishExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/exams/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });
};

export const useExamTokens = (examId: string) =>
  useQuery({ queryKey: qk.examTokens(examId), queryFn: () => apiClient.get<Record<string, unknown>[]>(`/exams/${examId}/tokens`), enabled: !!examId });

export const useGenerateToken = (examId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: object) => apiClient.post(`/exams/${examId}/tokens`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.examTokens(examId) }),
  });
};

export const useExamPool = (examId: string) =>
  useQuery({ queryKey: qk.examPool(examId), queryFn: () => apiClient.get<Record<string, unknown>[]>(`/exams/${examId}/question-pool`), enabled: !!examId });

export const useAddQuestions = (examId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: object) => apiClient.post(`/exams/${examId}/questions`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.examPool(examId) }),
  });
};

// ── Exam Session (student) ────────────────────────────────────────────────────
export const useStartSession = (examId: string) =>
  useMutation({ mutationFn: (body: object) => apiClient.post(`/exam-sessions/${examId}/start`, body) });

export const useSaveAnswer = (sessionId: string) =>
  useMutation({ mutationFn: (body: object) => apiClient.post(`/exam-sessions/session/${sessionId}/answer`, body) });

export const useSubmitSession = () =>
  useMutation({ mutationFn: (sessionId: string) => apiClient.post(`/exam-sessions/session/${sessionId}/submit`) });

export const useSessionDetail = (sessionId: string) =>
  useQuery({ queryKey: qk.session(sessionId), queryFn: () => apiClient.get<Record<string, unknown>>(`/exam-sessions/session/${sessionId}`), enabled: !!sessionId });

/** Staff-only: every student's result + ranking for a given exam. */
export const useExamResults = (examId: string) =>
  useQuery({ queryKey: qk.examResults(examId), queryFn: () => apiClient.get<Record<string, unknown>[]>(`/exam-sessions/exam/${examId}/results`), enabled: !!examId });

/** Student: my latest session for an exam (used by "Ujian Saya" history to link into the result page). */
export const useMySessionForExam = (examId: string) =>
  useQuery({ queryKey: qk.mySession(examId), queryFn: () => apiClient.get<Record<string, unknown> | null>(`/exam-sessions/exam/${examId}/my-session`), enabled: !!examId });

/** Student: my full exam history — every attempt across every exam, newest first. */
export const useMyExamHistory = () =>
  useQuery({ queryKey: qk.myHistory, queryFn: () => apiClient.get<Record<string, unknown>[]>('/exam-sessions/history') });

// ── Analytics ─────────────────────────────────────────────────────────────────
export const useExamAnalytics = (examId: string) =>
  useQuery({ queryKey: qk.analytics(examId), queryFn: () => apiClient.get<Record<string, unknown>>(`/analytics/exam/${examId}`), enabled: !!examId });

// ── Notifications ─────────────────────────────────────────────────────────────
export const useNotifications = (params?: object) =>
  useQuery({ queryKey: qk.notifications(params), queryFn: () => apiClient.get<PaginatedResponse<Record<string, unknown>>>('/notifications', params), refetchInterval: 30_000 });

export const useUnreadCount = () =>
  useQuery({ queryKey: qk.unreadCount, queryFn: () => apiClient.get<{ count: number }>('/notifications/unread-count'), refetchInterval: 30_000 });

export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/notifications/mark-all-read'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });
};

// ── Audit Logs ────────────────────────────────────────────────────────────────
export const useAuditLogs = (params?: object) =>
  useQuery({ queryKey: qk.auditLogs(params), queryFn: () => apiClient.get<PaginatedResponse<Record<string, unknown>>>('/audit-logs', params) });
