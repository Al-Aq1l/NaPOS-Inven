"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import axios from "axios";

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
      const user = await login(email, password);
      router.push(
        user.role === "superadmin"
          ? "/admin/dashboard"
          : user.role === "cashier"
          ? "/dashboard/pos"
          : "/dashboard"
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.response?.data?.errors?.email?.[0] || "Invalid credentials");
      } else {
        setError("Invalid credentials");
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Selamat datang kembali</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Masuk ke akun NAPS Anda</p>

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
          <Link href="/forgot-password" className="text-sm text-[var(--brand-600)] hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={isLoading} className="w-full">
          Masuk
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
        Don&#39;t have an account?{" "}
        <Link href="/register" className="text-[var(--brand-600)] font-medium hover:underline">
          Sign up free
        </Link>
      </p>
    </div>
  );
}

