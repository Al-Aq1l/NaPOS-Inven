"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Zap, ShoppingCart, Package, BarChart3, Globe, Building2,
  Wifi, WifiOff, Smartphone, Shield, ArrowRight, Check,
  TrendingUp, Calculator, Bell
} from "lucide-react";
import { Button } from "@/components/ui";
import { motion } from "framer-motion";
import { PRICING_TIERS, formatIDR } from "@/lib/constants";
import { cn } from "@/lib/utils";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function LandingPage() {
  const [annual, setAnnual] = useState(false);
  return (
    <div className="bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background Gradients */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], x: [0, -50, 0], y: [0, 50, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20"
        />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(var(--slate-400) 1px, transparent 1px), linear-gradient(90deg, var(--slate-400) 1px, transparent 1px)",
          backgroundSize: "64px 64px"
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-24">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl mx-auto text-center"
          >
            {/* Badge */}
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md border border-blue-200/50 rounded-full text-sm font-medium text-blue-700 shadow-sm mb-8 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-300">
              <Zap className="w-4 h-4 text-amber-500" />
              Built for Indonesian MSMEs
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={fadeIn} className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1] drop-shadow-sm">
              Capital Efficiency.{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Omnichannel Scalability.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p variants={fadeIn} className="mt-8 text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
              The all-in-one POS & inventory platform that helps your business sell smarter,
              manage stock with mathematical precision, and scale across every channel.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeIn} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="min-w-[200px] h-14 text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="min-w-[200px] h-14 text-base bg-white/50 backdrop-blur-sm border-slate-300 hover:bg-white dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-slate-800 transition-all hover:scale-105">
                  View Demo
                </Button>
              </Link>
            </motion.div>

            {/* Trust */}
            <motion.p variants={fadeIn} className="mt-8 text-sm text-slate-500 font-medium">
              Free forever for 1 store · No credit card required · Setup in 2 minutes
            </motion.p>
          </motion.div>

          {/* Dashboard Preview Card */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, type: "spring", bounce: 0.3 }}
            className="mt-20 max-w-5xl mx-auto"
          >
            <div className="relative rounded-2xl border border-white/20 bg-white/40 backdrop-blur-xl shadow-2xl overflow-hidden dark:bg-slate-900/60 dark:border-slate-700/50">
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/5 dark:to-transparent pointer-events-none" />
              {/* Fake browser bar */}
              <div className="relative flex items-center gap-2 px-4 py-3 border-b border-slate-200/50 bg-white/50 dark:border-slate-800/50 dark:bg-slate-800/50">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm" />
                  <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" />
                  <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-6 bg-slate-100/50 dark:bg-slate-900/50 rounded-md max-w-sm mx-auto flex items-center justify-center text-xs text-slate-500 font-medium">
                    app.napos.id/dashboard
                  </div>
                </div>
              </div>
              {/* Dashboard preview content */}
              <div className="relative p-6 sm:p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Today Revenue", value: "Rp 11.4M", change: "+11.4%", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
                    { label: "Transactions", value: "284", change: "+12 today", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
                    { label: "Low Stock Items", value: "7", change: "Alert", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
                    { label: "Active Channels", value: "4", change: "All synced", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
                  ].map((stat, idx) => (
                    <motion.div
                      key={stat.label}
                      whileHover={{ scale: 1.05 }}
                      className="p-5 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl border border-white/20 dark:border-slate-700/50 shadow-sm"
                    >
                      <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{stat.value}</p>
                      <div className={`inline-flex items-center mt-2 px-2 py-1 rounded-md text-xs font-semibold ${stat.color} ${stat.bg}`}>
                        {stat.change}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="col-span-2 h-48 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl border border-white/20 dark:border-slate-700/50 flex items-center justify-center p-6 shadow-sm">
                    <div className="flex items-end gap-2 w-full h-full justify-between">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ duration: 1, delay: 0.5 + i * 0.05 }}
                          className="w-full max-w-[2rem] bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t-sm opacity-90 hover:opacity-100 transition-opacity"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="h-48 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl border border-white/20 dark:border-slate-700/50 flex items-center justify-center shadow-sm">
                    <div className="relative w-32 h-32">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-700" strokeWidth="3" />
                        <motion.circle
                          initial={{ strokeDasharray: "0 100" }}
                          animate={{ strokeDasharray: "75 25" }}
                          transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
                          cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className="text-blue-500" strokeWidth="3" strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-slate-900 dark:text-white">75%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-900/50 skew-y-3 transform origin-top-left -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Everything you need to run your business
            </h2>
            <p className="mt-4 text-xl text-slate-600 dark:text-slate-400">
              From point-of-sale to inventory optimization, NAPOS handles it all.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: ShoppingCart, title: "Hybrid POS Terminal", desc: "Works offline with IndexedDB. Syncs automatically when back online. Camera-based barcode scanning." },
              { icon: Package, title: "Smart Inventory", desc: "EOQ & ROP optimization with automated stock alerts. Know exactly when and how much to reorder." },
              { icon: BarChart3, title: "Real-time Analytics", desc: "Sales trends, peak hours, profit margins. Tier-based insights from basic to enterprise." },
              { icon: Globe, title: "Omnichannel Sync", desc: "Aggregate orders from marketplace channels and your physical store in one unified dashboard." },
              { icon: Building2, title: "Multi-Branch", desc: "Manage up to 5 locations with consolidated reporting and inter-branch stock transfers." },
              { icon: Shield, title: "Role-Based Access", desc: "Owner, Manager, Cashier, Viewer — each sees only what they need. Cashiers never see COGS." },
              { icon: Smartphone, title: "Mobile-First POS", desc: "Designed for floor staff using smartphones. Perfect for Stock Opname on the go." },
              { icon: Calculator, title: "Capital Efficiency", desc: "Reduce dead stock with mathematical optimization. EOQ ensures you order the right amount." },
              { icon: Bell, title: "Smart Alerts", desc: "Stock below reorder point? Marketplace order pending? Get notified instantly via toast and push." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, delay: i * 0.1 }
                }}
                viewport={{ once: true, margin: "-50px" }}
                className="h-full"
              >
                <div className="group p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-200 ease-out relative overflow-hidden h-full">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-bl-full -z-10 transition-transform duration-200 group-hover:scale-110" />
                  <div className="w-14 h-14 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl mb-6 shadow-sm">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 relative overflow-hidden bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Header */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="max-w-3xl mx-auto text-center mb-12"
          >
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Paket Harga Transparan
            </h2>
            <p className="mt-4 text-xl text-slate-600 dark:text-slate-400">
              Mulai gratis. Naik kelas saat bisnis berkembang.
            </p>
            {/* Toggle */}
            <div className="mt-8 inline-flex items-center gap-3 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 shadow-sm">
              <button
                onClick={() => setAnnual(false)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer",
                  !annual ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Bulanan
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer",
                  annual ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Tahunan
                <span className="ml-1.5 text-xs opacity-85 px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-full font-bold">Hemat 20%</span>
              </button>
            </div>
          </motion.div>

          {/* Tier Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING_TIERS.map((tier, i) => {
              const price = annual ? tier.annualPrice : tier.price;
              return (
                <motion.div
                  key={tier.key}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, delay: i * 0.1 }
                  }}
                  viewport={{ once: true, margin: "-50px" }}
                >
                  <div
                    className={cn(
                      "relative flex flex-col p-6 bg-white dark:bg-slate-900 border rounded-2xl hover:shadow-xl hover:-translate-y-1.5 transition-all duration-200 ease-out h-full",
                      tier.highlighted
                        ? "border-blue-500 shadow-lg ring-1 ring-blue-500"
                        : "border-slate-200 dark:border-slate-800 shadow-sm"
                    )}
                  >
                    {/* Badge */}
                    {tier.badge && (
                      <div className={cn(
                        "absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap",
                        tier.highlighted
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      )}>
                        {tier.badge}
                      </div>
                    )}

                    {/* Tier Info */}
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{tier.name}</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 min-h-[40px]">{tier.description}</p>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      {tier.price === 0 ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                            Free
                          </span>
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded w-max">
                            selamanya
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                            {formatIDR(price)}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800/80 dark:text-slate-400 px-2 py-0.5 rounded w-max">
                            per {annual ? "tahun" : "bulan"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Limits */}
                    <div className="flex gap-4 mb-6 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                      <div className="text-center flex-1">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {tier.skuLimit === "unlimited" ? "∞" : tier.skuLimit}
                        </p>
                        <p className="text-xs text-slate-500">SKUs</p>
                      </div>
                      <div className="w-px bg-slate-200 dark:bg-slate-800" />
                      <div className="text-center flex-1">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{tier.userLimit}</p>
                        <p className="text-xs text-slate-500">Pengguna</p>
                      </div>
                      <div className="w-px bg-slate-200 dark:bg-slate-800" />
                      <div className="text-center flex-1">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{tier.branchLimit}</p>
                        <p className="text-xs text-slate-500">Cabang</p>
                      </div>
                    </div>

                    {/* CTA */}
                    <Link href="/register" className="mb-6">
                      <Button
                        variant={tier.highlighted ? "primary" : "outline"}
                        className={cn("w-full h-11 transition-all hover:scale-[1.02]", tier.highlighted ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20" : "")}
                      >
                        {tier.price === 0 ? "Mulai Sekarang" : "Coba Gratis"}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>

                    {/* Features */}
                    <ul className="space-y-3 flex-1">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-slate-600 dark:text-slate-400">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Offline/Online Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-[800px] bg-gradient-to-l from-emerald-500/10 to-transparent blur-3xl -z-10 rounded-full" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-emerald-400 border border-slate-700/50 rounded-full text-sm font-bold mb-6 shadow-lg">
                <Wifi className="w-4 h-4" /> Works Offline
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Never miss a sale, <br />even without internet
              </h2>
              <p className="mt-6 text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
                Our hybrid POS stores transactions locally using IndexedDB. When connectivity returns,
                everything syncs automatically with timestamp-based conflict resolution.
              </p>
              <div className="mt-10 space-y-5">
                {[
                  "IndexedDB local storage for products & orders",
                  "Automatic background sync on reconnection",
                  "Timestamp-based conflict resolution",
                  "Visual connection status indicator",
                ].map((item, i) => (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    key={item}
                    className="flex items-center gap-4"
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-full flex-shrink-0 dark:bg-emerald-900/50 dark:text-emerald-400 shadow-sm">
                      <Check className="w-5 h-5" />
                    </div>
                    <span className="text-lg text-slate-700 dark:text-slate-300 font-medium">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="relative z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-t-2xl" />
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sync Status</h3>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-emerald-400 border border-slate-700 rounded-full text-sm font-bold">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    </span>
                    Online
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Products synced", val: "1,247 / 1,247" },
                    { label: "Pending orders", val: "0 pending" },
                    { label: "Last sync", val: "2 seconds ago" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{row.label}</span>
                      <span className="text-slate-900 dark:text-white font-bold">{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating offline card */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 z-20 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Connection lost</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">3 orders queued locally</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24 bg-slate-100 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-full text-sm font-bold mb-6">
                <Building2 className="w-4 h-4" /> About NaPOS
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Empowering Indonesian MSMEs with smart technology
              </h2>
              <div className="mt-6 space-y-6 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  NaPOS is a comprehensive SaaS platform designed specifically for Micro, Small, and Medium
                  Enterprises (MSMEs) in Indonesia. We combine Point-of-Sale, inventory management, and
                  omnichannel selling into one seamless experience.
                </p>
                <p>
                  Our mission is to help businesses reduce capital waste through mathematical inventory
                  optimization (EOQ &amp; ROP), while providing enterprise-grade features at an affordable price.
                </p>
              </div>
            </motion.div>

            <div className="space-y-6">
              {[
                { title: "Smart Inventory Optimization", desc: "EOQ and ROP calculations ensure you order the right amount at the right time, minimizing dead stock and maximizing capital efficiency." },
                { title: "Hybrid Offline-Online POS", desc: "Never miss a sale — our POS works offline with IndexedDB and syncs seamlessly when back online with conflict resolution." },
                { title: "Multi-Channel Integration", desc: "Manage physical stores and marketplace channels from a single unified dashboard with real-time stock synchronization." },
                { title: "Role-Based Multi-Branch", desc: "Scale from 1 store to 5 locations with consolidated reporting, inter-branch transfers, and granular access controls." },
              ].map(({ title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                >
                  <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl hover:shadow-lg hover:-translate-y-1.5 transition-all duration-200 ease-out group h-full cursor-pointer">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-10 sm:p-16 lg:p-20 text-center shadow-2xl"
          >
            {/* Abstract Background Elements */}
            <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />

            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: "radial-gradient(circle at 25% 25%, white 2px, transparent 2px)",
              backgroundSize: "40px 40px"
            }} />

            <div className="relative z-10">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight drop-shadow-md">
                Ready to grow your business?
              </h2>
              <p className="mt-6 text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
                Join thousands of Indonesian MSMEs using NAPOS to optimize inventory and boost sales.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="min-w-[200px] h-14 text-lg bg-white !text-blue-800 font-bold hover:bg-blue-50 hover:!text-blue-900 shadow-xl transition-all hover:scale-105">
                    Get Started Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
              <p className="mt-6 text-sm text-blue-200 font-medium opacity-80">Start with our free forever Starter plan · No credit card required</p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
