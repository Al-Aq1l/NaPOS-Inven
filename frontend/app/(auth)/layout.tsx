import { Zap } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left — Brand Panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[var(--brand-700)] to-[var(--brand-950)]">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />
        <div className="relative flex flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">NAPOS</span>
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Manage your entire business from one platform.
            </h2>
            <p className="mt-4 text-blue-200 leading-relaxed">
              Smart inventory optimization, offline POS, and omnichannel sync — all designed for Indonesian MSMEs.
            </p>
          </div>
          <p className="text-sm text-blue-300">© {new Date().getFullYear()} NAPOS. All rights reserved.</p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-[var(--background)]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-[var(--brand-600)] rounded-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[var(--text-primary)]">NAPOS</span>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
