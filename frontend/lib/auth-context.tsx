"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { type UserRole } from "@/lib/constants";
import api from "@/lib/api";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "starter" | "basic" | "growth" | "business";
  trialEndsAt: string | null;
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string | null;
  tenant: Tenant;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (_role: UserRole) => void;
  hasRole: (...roles: UserRole[]) => boolean;
  canAccess: (feature: string) => boolean;
}

const FEATURE_ACCESS: Record<string, UserRole[]> = {
  pos: ["owner", "manager", "cashier"],
  inventory: ["owner", "manager"],
  "inventory.cost": ["owner", "manager"],
  analytics: ["owner", "manager", "viewer"],
  "analytics.profit": ["owner", "manager"],
  "analytics.cogs": ["owner", "manager"],
  "analytics.export": ["owner", "manager"],
  channels: ["owner", "manager"],
  branches: ["owner", "manager"],
  settings: ["owner", "manager"],
  "settings.billing": ["owner"],
  "settings.users": ["owner"],
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isAuthenticated: false, isLoading: true });

  useEffect(() => {
    const fetchUser = async () => {
      if (typeof window !== "undefined" && localStorage.getItem("access_token")) {
        try {
          const res = await api.get("/me");
          setState({ user: res.data.user, isAuthenticated: true, isLoading: false });
        } catch (_error) {
          localStorage.removeItem("access_token");
          setState({ user: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    };
    fetchUser();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const res = await api.post("/login", { email, password });
      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", res.data.access_token);
      }
      setState({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      setState((s) => ({ ...s, isLoading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/logout");
    } catch (error) {
      console.error(error);
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
      }
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  // Role wajib mengikuti data backend/login.
  const switchRole = useCallback((_role: UserRole) => {}, []);

  const hasRole = useCallback((...roles: UserRole[]) => {
    if (!state.user) return false;
    return roles.includes(state.user.role);
  }, [state.user]);

  const canAccess = useCallback((feature: string) => {
    if (!state.user) return false;
    const allowed = FEATURE_ACCESS[feature];
    if (!allowed) return true;
    return allowed.includes(state.user.role);
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, switchRole, hasRole, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

