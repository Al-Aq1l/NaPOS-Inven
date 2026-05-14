import Link from "next/link";
import { Zap } from "lucide-react";

export function Footer() {
  const links = {
    Product: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "/pricing" },
      { label: "POS Terminal", href: "#" },
      { label: "Inventory", href: "#" },
    ],
    Company: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
    ],
    Support: [
      { label: "Help Center", href: "#" },
      { label: "API Docs", href: "#" },
      { label: "Status", href: "#" },
      { label: "Community", href: "#" },
    ],
    Legal: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "#" },
    ],
  };

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface-raised)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 bg-[var(--brand-600)] rounded-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-[var(--text-primary)]">NAPOS</span>
            </Link>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Smart Inventory & POS platform built for Indonesian MSMEs.
            </p>
          </div>

          {/* Link Groups */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{group}</h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--text-tertiary)]">
            © {new Date().getFullYear()} NAPOS. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[var(--text-tertiary)]">Made with ❤️ in Indonesia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
