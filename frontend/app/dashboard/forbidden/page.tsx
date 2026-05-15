"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Card, Button } from "@/components/ui";

export default function ForbiddenPage() {
  const params = useSearchParams();
  const from = params.get("from");

  return (
    <div className="max-w-2xl mx-auto py-10">
      <Card className="text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-[var(--danger-50)] text-[var(--danger-500)] flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">403 - Akses Ditolak</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          Role Anda tidak memiliki izin untuk membuka halaman ini.
        </p>
        {from && (
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            Halaman: {from}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-2">
          <Link href="/dashboard">
            <Button size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Kembali ke Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
