import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api";

interface User {
  id: string;
  username: string;
  email: string;
  role?: "admin" | "user" | string;
  avatar: string | null;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hasHydrated: boolean;

  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hasHydrated: false,

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ email, password });
          const { accessToken, refreshToken } = response.data.data;
          set({ accessToken, refreshToken, isAuthenticated: true });
          await get().fetchUser();
        } catch (error: any) {
          const message = error.response?.data?.error || "Login failed";
          set({ error: message, isAuthenticated: false });
          throw new Error(message);
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (username, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register({ username, email, password });
          const { accessToken, refreshToken } = response.data.data;
          set({ accessToken, refreshToken, isAuthenticated: true });
          await get().fetchUser();
        } catch (error: any) {
          const message = error.response?.data?.error || "Registration failed";
          set({ error: message, isAuthenticated: false });
          throw new Error(message);
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const refreshToken = get().refreshToken;
        if (refreshToken) {
          try {
            await authApi.logout(refreshToken);
          } catch (error) {
            // Ignore logout errors
          }
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      fetchUser: async () => {
        try {
          const response = await authApi.me();
          set({ user: response.data.data });
        } catch (error: any) {
          if (error.response?.status === 401) {
            get().logout();
          }
        }
      },

      clearError: () => set({ error: null }),
      setHydrated: (hydrated) => set({ hasHydrated: hydrated }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        if (state?.isAuthenticated && state.accessToken) {
          void state.fetchUser();
        }
      },
    }
  )
);
