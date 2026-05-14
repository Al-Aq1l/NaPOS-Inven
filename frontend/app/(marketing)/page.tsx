import Link from "next/link";
import {
  Zap, ShoppingCart, Package, BarChart3, Globe, Building2,
  Wifi, WifiOff, Smartphone, Shield, ArrowRight, Check,
  TrendingUp, Calculator, Bell
} from "lucide-react";
import { Button } from "@/components/ui";

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center gradient-mesh overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(var(--slate-400) 1px, transparent 1px), linear-gradient(90deg, var(--slate-400) 1px, transparent 1px)",
          backgroundSize: "64px 64px"
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-24">
          <div className="max-w-3xl mx-auto text-center stagger-children">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--brand-50)] border border-[var(--brand-200)] rounded-full text-sm font-medium text-[var(--brand-700)] mb-6 dark:bg-[var(--brand-950)] dark:border-[var(--brand-800)] dark:text-[var(--brand-300)]">
              <Zap className="w-3.5 h-3.5" />
              Built for Indonesian MSMEs
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--text-primary)] tracking-tight leading-[1.1]">
              Capital Efficiency.{" "}
              <span className="bg-gradient-to-r from-[var(--brand-600)] to-[#6366f1] bg-clip-text text-transparent">
                Omnichannel Scalability.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
              The all-in-one POS & inventory platform that helps your business sell smarter,
              manage stock with mathematical precision, and scale across every channel.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register">
                <Button size="lg" className="min-w-[200px]">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  View Demo
                </Button>
              </Link>
            </div>

            {/* Trust */}
            <p className="mt-6 text-sm text-[var(--text-tertiary)]">
              Free forever for 1 store · No credit card required · Setup in 2 minutes
            </p>
          </div>

          {/* Dashboard Preview Card */}
          <div className="mt-16 max-w-5xl mx-auto animate-fade-in-up" style={{ animationDelay: "600ms" }}>
            <div className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xl)] overflow-hidden">
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-raised)]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-6 bg-[var(--slate-100)] dark:bg-[var(--slate-800)] rounded-md max-w-sm mx-auto flex items-center justify-center text-xs text-[var(--text-tertiary)]">
                    app.napos.id/dashboard
                  </div>
                </div>
              </div>
              {/* Dashboard preview content */}
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Today Revenue", value: "Rp 12.4M", change: "+18.2%", color: "text-green-500" },
                    { label: "Transactions", value: "284", change: "+12 today", color: "text-blue-500" },
                    { label: "Low Stock Items", value: "7", change: "Alert", color: "text-amber-500" },
                    { label: "Active Channels", value: "4", change: "All synced", color: "text-green-500" },
                  ].map((stat) => (
                    <div key={stat.label} className="p-4 bg-[var(--surface-raised)] rounded-lg border border-[var(--border)]">
                      <p className="text-xs text-[var(--text-tertiary)]">{stat.label}</p>
                      <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{stat.value}</p>
                      <p className={`text-xs font-medium mt-1 ${stat.color}`}>{stat.change}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 h-40 bg-[var(--surface-raised)] rounded-lg border border-[var(--border)] flex items-center justify-center">
                    <div className="flex items-end gap-1 h-24">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                        <div
                          key={i}
                          className="w-4 sm:w-6 bg-gradient-to-t from-[var(--brand-600)] to-[var(--brand-400)] rounded-sm opacity-90"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="h-40 bg-[var(--surface-raised)] rounded-lg border border-[var(--border)] flex items-center justify-center">
                    <div className="relative w-20 h-20">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--slate-200)" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--brand-500)" strokeWidth="3" strokeDasharray="75 25" strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[var(--text-primary)]">75%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28 bg-[var(--surface-raised)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
              Everything you need to run your business
            </h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">
              From point-of-sale to inventory optimization, NAPOS handles it all.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {[
              { icon: ShoppingCart, title: "Hybrid POS Terminal", desc: "Works offline with IndexedDB. Syncs automatically when back online. Camera-based barcode scanning." },
              { icon: Package, title: "Smart Inventory", desc: "EOQ & ROP optimization with automated stock alerts. Know exactly when and how much to reorder." },
              { icon: BarChart3, title: "Real-time Analytics", desc: "Sales trends, peak hours, profit margins. Tier-based insights from basic to enterprise." },
              { icon: Globe, title: "Omnichannel Sync", desc: "Aggregate orders from Shopee, Tokopedia, and your physical store in one unified dashboard." },
              { icon: Building2, title: "Multi-Branch", desc: "Manage up to 5 locations with consolidated reporting and inter-branch stock transfers." },
              { icon: Shield, title: "Role-Based Access", desc: "Owner, Manager, Cashier, Viewer — each sees only what they need. Cashiers never see COGS." },
              { icon: Smartphone, title: "Mobile-First POS", desc: "Designed for floor staff using smartphones. Perfect for Stock Opname on the go." },
              { icon: Calculator, title: "Capital Efficiency", desc: "Reduce dead stock with mathematical optimization. EOQ ensures you order the right amount." },
              { icon: Bell, title: "Smart Alerts", desc: "Stock below reorder point? Marketplace order pending? Get notified instantly via toast and push." },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group p-6 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:shadow-[var(--shadow-md)] hover:border-[var(--brand-200)] hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-[var(--brand-50)] text-[var(--brand-600)] rounded-lg mb-4 group-hover:bg-[var(--brand-100)] transition-colors dark:bg-[var(--brand-950)] dark:text-[var(--brand-400)]">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Offline/Online Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium mb-4 dark:bg-green-900/30 dark:text-green-400">
                <Wifi className="w-3.5 h-3.5" /> Works Offline
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
                Never miss a sale, even without internet
              </h2>
              <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
                Our hybrid POS stores transactions locally using IndexedDB. When connectivity returns,
                everything syncs automatically with timestamp-based conflict resolution.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  "IndexedDB local storage for products & orders",
                  "Automatic background sync on reconnection",
                  "Timestamp-based conflict resolution",
                  "Visual connection status indicator",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 flex items-center justify-center bg-[var(--brand-100)] text-[var(--brand-600)] rounded-full flex-shrink-0 dark:bg-[var(--brand-900)] dark:text-[var(--brand-400)]">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-sm text-[var(--text-secondary)]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-[var(--shadow-lg)]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-[var(--text-primary)]">Sync Status</h3>
                  <div className="flex items-center gap-2 px-2.5 py-1 bg-green-50 text-green-600 rounded-full text-xs font-medium dark:bg-green-900/30 dark:text-green-400">
                    <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span><span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span></span>
                    Online
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Products synced", val: "1,247 / 1,247", pct: 100 },
                    { label: "Pending orders", val: "0 pending", pct: 100 },
                    { label: "Last sync", val: "2 seconds ago", pct: 100 },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between p-3 bg-[var(--surface-raised)] rounded-lg">
                      <span className="text-sm text-[var(--text-secondary)]">{row.label}</span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Floating offline card */}
              <div className="absolute -bottom-4 -left-4 bg-[var(--surface)] border border-amber-200 rounded-lg p-3 shadow-[var(--shadow-md)] animate-float dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-xs font-medium text-[var(--text-primary)]">Connection lost</p>
                    <p className="text-xs text-[var(--text-tertiary)]">3 orders queued locally</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-800)] p-8 sm:p-12 lg:p-16 text-center">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)",
              backgroundSize: "32px 32px"
            }} />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Ready to grow your business?
              </h2>
              <p className="mt-4 text-lg text-blue-100 max-w-xl mx-auto">
                Join thousands of Indonesian MSMEs using NAPOS to optimize inventory and boost sales.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/register">
                  <Button size="lg" className="min-w-[200px] bg-white text-[var(--brand-700)] hover:bg-blue-50">
                    Get Started Free
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-sm text-blue-200">No credit card required · 14-day free trial on all plans</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
