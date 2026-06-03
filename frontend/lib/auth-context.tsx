"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { type UserRole } from "@/lib/constants";
import api from "@/lib/api";
import type { ApiBranch } from "@/lib/dashboard-api";

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
  branch_id: number | null;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string | null;
  tenant: Tenant;
  branch: ApiBranch | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  switchRole: (_role: UserRole) => void;
  hasRole: (...roles: UserRole[]) => boolean;
  canAccess: (feature: string) => boolean;
}

const FEATURE_ACCESS: Record<string, UserRole[]> = {
  pos: ["owner", "cashier"],
  inventory: ["owner", "manager"],
  "inventory.cost": ["owner", "manager"],
  analytics: ["owner", "manager"],
  "analytics.profit": ["owner", "manager"],
  "analytics.cogs": ["owner", "manager"],
  "analytics.export": ["owner", "manager"],
  channels: [],
  branches: ["owner", "manager"],
  settings: ["owner"],
  "settings.billing": ["owner"],
  "settings.users": ["owner"],
};

const PLAN_FEATURES: Record<Tenant["plan"], string[]> = {
  starter: ["pos", "inventory", "branches"],
  basic: ["pos", "inventory", "branches", "analytics"],
  growth: ["pos", "inventory", "branches", "analytics", "inventory.transfers", "inventory.opname", "inventory.optimization"],
  business: ["pos", "inventory", "branches", "analytics", "inventory.transfers", "inventory.opname", "inventory.optimization", "channels"],
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
        } catch {
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
      const user = res.data.user as User;
      setState({ user, isAuthenticated: true, isLoading: false });
      return user;
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
        Object.keys(sessionStorage)
          .filter((key) => key.startsWith("dashboard-stock-alert:"))
          .forEach((key) => sessionStorage.removeItem(key));
      }
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  // Role wajib mengikuti data backend/login.
  const switchRole = useCallback(() => {}, []);

  const hasRole = useCallback((...roles: UserRole[]) => {
    if (!state.user) return false;
    return roles.includes(state.user.role);
  }, [state.user]);

  const canAccess = useCallback((feature: string) => {
    if (!state.user) return false;
    const allowed = FEATURE_ACCESS[feature];
    const roleAllowed = allowed ? allowed.includes(state.user.role) : true;
    if (!roleAllowed) return false;

    if (feature.startsWith("settings")) return true;

    const planFeatures = PLAN_FEATURES[state.user.tenant.plan] ?? PLAN_FEATURES.starter;
    return planFeatures.includes(feature) || planFeatures.some((item) => feature.startsWith(`${item}.`));
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
