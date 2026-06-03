import Image from "next/image";
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
        <div className="relative flex min-h-screen w-full flex-col justify-between p-12">
          <Link href="/login" className="block w-40">
            <Image
              src="/logo2.png"
              alt="NAPS"
              width={338}
              height={186}
              priority
              className="h-auto w-full"
            />
          </Link>
          <div className="flex flex-1 items-center justify-center py-10">
            <Image
              src="/napsrender.png"
              alt="Perangkat kasir NAPS"
              width={1512}
              height={1040}
              priority
              className="h-auto w-full max-w-[760px] object-contain drop-shadow-[0_28px_55px_rgba(2,8,23,0.45)]"
            />
          </div>
          <div>
            <h2 className="max-w-lg text-3xl font-bold leading-tight text-white">
              Kelola kasir, stok, dan cabang dalam satu dashboard.
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-blue-200">
              Sistem POS modern untuk operasional toko harian, lengkap dengan printer struk, scanner barcode, dan laporan stok yang rapi.
            </p>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-[var(--background)]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Link href="/login" className="block w-32">
              <Image
                src="/logo2.png"
                alt="NAPS"
                width={338}
                height={186}
                priority
                className="h-auto w-full"
              />
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
