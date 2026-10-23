import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Role } from '../api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  hasRole: (roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      hasRole: (roles) => {
        const { user } = get();
        if (!user) return false;
        // SUPER_ADMIN has access to ADMIN routes as well
        if (user.role === 'SUPER_ADMIN') return true; 
        return roles.includes(user.role);
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
