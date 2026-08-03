"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  api,
  clearToken,
  readToken,
  readTokenExpiresAt,
  storeToken,
} from "@/lib/api";
import type { AuthResponse, AuthUser } from "@/lib/types";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    location: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const refreshUser = useCallback(async () => {
    const { data } = await api.get<AuthUser>("/auth/me");
    setUser(data);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const bootstrap = readToken() ? refreshUser() : Promise.resolve();
      bootstrap
        .catch(() => {
          clearToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshUser]);

  useEffect(() => {
    if (!user) return;
    const expiresAt = readTokenExpiresAt();
    if (!expiresAt) return;

    const expireSession = () => {
      clearToken();
      setUser(null);
      queryClient.clear();
      router.replace("/login");
    };
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      expireSession();
      return;
    }
    const timerId = window.setTimeout(expireSession, remaining);
    return () => window.clearTimeout(timerId);
  }, [queryClient, router, user]);

  async function acceptAuth(response: AuthResponse) {
    storeToken(response.accessToken);
    setUser(response.user);
    await queryClient.invalidateQueries();
    router.replace(
      response.user.interests.length && response.user.location.trim()
        ? "/feed"
        : "/onboarding",
    );
  }

  async function login(identifier: string, password: string) {
    const { data } = await api.post<AuthResponse>("/auth/login", {
      identifier,
      password,
    });
    await acceptAuth(data);
  }

  async function register(input: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    location: string;
  }) {
    const { data } = await api.post<AuthResponse>("/auth/register", input);
    await acceptAuth(data);
  }

  function logout() {
    clearToken();
    setUser(null);
    queryClient.clear();
    router.replace("/login");
  }

  const value = { user, loading, login, register, logout, refreshUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
