import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  schoolId: string | null;
  avatarUrl: string | null;
  phone?: string | null;
  classId?: string | null;
  className?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, token: string) => void;
  setAccessToken: (token: string) => void;
  /** Merges partial fields into the current user — used after profile/avatar edits so the UI updates without a re-login. */
  updateUser: (partial: Partial<AuthUser>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true }),

      setAccessToken: (accessToken) =>
        set({ accessToken }),

      updateUser: (partial) =>
        set((state) => (state.user ? { user: { ...state.user, ...partial } } : state)),

      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
        // Clear persisted storage on logout
        localStorage.removeItem('examora-auth');
      },
    }),
    {
      name: 'examora-auth',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
    },
  ),
);

export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useUserRole = () => useAuthStore((s) => s.user?.role ?? '');
