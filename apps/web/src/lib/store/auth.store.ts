import { create } from 'zustand';

export interface AuthUser {
  _id: string;
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'manager' | 'admin';
  department: string;
  designation: string;
  timezone: string;
  profilePhoto?: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** True while the app is silently trying to restore the session on first load */
  isRestoring: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  setUser: (patch: Partial<AuthUser>) => void;
  clearAuth: () => void;
  setRestoring: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  user: null,
  isRestoring: true,
  setAuth: (token, user) => set({ accessToken: token, user, isRestoring: false }),
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (patch) => set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
  clearAuth: () => set({ accessToken: null, user: null, isRestoring: false }),
  setRestoring: (v) => set({ isRestoring: v }),
}));
