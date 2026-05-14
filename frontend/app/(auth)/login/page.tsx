"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.errors?.email?.[0] || "Invalid credentials");
    }
  };

  const quickLogin = async (role: string) => {
    setError(null);
    try {
      await login(`${role}@napos.id`, "password");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.errors?.email?.[0] || "Login failed");
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome back</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Sign in to your NAPOS account</p>

      {error && (
        <div className="mt-4 p-3 bg-[var(--danger-50)] text-[var(--danger-600)] border border-[var(--danger-200)] rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="mt-6 space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@business.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
          required
        />
        <Input
          label="Password"
          type={showPw ? "text" : "password"}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button type="button" onClick={() => setShowPw(!showPw)} className="cursor-pointer">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          required
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
            <input type="checkbox" className="rounded border-[var(--border)]" />
            Remember me
          </label>
          <Link href="#" className="text-sm text-[var(--brand-600)] hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={isLoading} className="w-full">
          Sign in
        </Button>
      </form>

      {/* Quick Demo Access */}
      <div className="mt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border)]" /></div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-[var(--background)] text-[var(--text-tertiary)]">Quick Demo Login</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {["owner", "manager", "cashier", "viewer"].map((role) => (
            <button
              key={role}
              onClick={() => quickLogin(role)}
              className="px-3 py-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg hover:bg-[var(--slate-100)] hover:text-[var(--text-primary)] transition-colors capitalize cursor-pointer"
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
        Don&#39;t have an account?{" "}
        <Link href="/register" className="text-[var(--brand-600)] font-medium hover:underline">
          Sign up free
        </Link>
      </p>
    </div>
  );
}
