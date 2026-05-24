"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Languages } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Track active section via IntersectionObserver for hash links
  useEffect(() => {
    const sectionIds = ["features", "pricing", "about"];
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(`#${id}`);
          }
        },
        { rootMargin: "-40% 0px -55% 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Reset active section when scrolled to the very top
  useEffect(() => {
    const handler = () => {
      if (window.scrollY < 100) setActiveSection("");
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinks = [
    { label: t("navFeatures"), href: "/#features" },
    { label: t("navPricing"), href: "/#pricing" },
    { label: t("navAbout"), href: "/#about" },
  ];

  const isActive = (href: string) => {
    if (href.startsWith("/#")) return activeSection === href.replace("/", "");
    return pathname === href;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-3">
      <nav
        className={cn(
          "max-w-4xl mx-auto rounded-2xl transition-all duration-500 border",
          scrolled
            ? "bg-slate-50/80 backdrop-blur-2xl border-slate-200/60 shadow-[0_8px_32px_rgba(0,0,0,0.10)]"
            : "bg-slate-50/65 backdrop-blur-xl border-slate-200/40 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
        )}
      >
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo / Brand — Left */}
          <Link href="/" className="flex items-center group flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/NaPOS LOGO.png"
              alt="NAPS Logo"
              className="h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Nav Links — Center */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "relative px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-300",
                  "active:scale-[0.97]",
                  isActive(link.href)
                    ? "bg-blue-500/15 text-blue-700 shadow-[0_1px_4px_rgba(59,130,246,0.12)]"
                    : "text-slate-500 hover:text-blue-700 hover:bg-blue-500/10"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA — Right */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === "en" ? "id" : "en")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 cursor-pointer mr-1"
              title={language === "en" ? "Switch to Indonesian" : "Ubah ke Bahasa Inggris"}
            >
              <Languages className="w-3.5 h-3.5 text-slate-400 mr-1" />
              <span className={language === "en" ? "font-bold text-blue-600" : ""}>EN</span>
              <span className="text-slate-300">/</span>
              <span className={language === "id" ? "font-bold text-blue-600" : ""}>ID</span>
            </button>

            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg text-slate-600 hover:text-white hover:bg-blue-500 transition-all duration-300"
              >
                {t("navLogin")}
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="rounded-lg shadow-[0_2px_12px_rgba(59,130,246,0.3)] hover:shadow-[0_4px_20px_rgba(59,130,246,0.4)] transition-all duration-300 hover:-translate-y-0.5"
              >
                {t("navStartFree")}
              </Button>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
            mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-4 pb-3 pt-1 border-t border-slate-200/40">
            <div className="flex flex-col gap-0.5">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={cn(
                    "px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                    isActive(link.href)
                      ? "bg-blue-500/15 text-blue-700"
                      : "text-slate-500 hover:text-blue-700 hover:bg-blue-500/10"
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* Mobile Language Switcher */}
              <div className="flex items-center justify-between px-3.5 py-2">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-slate-400" />
                  Language / Bahasa
                </span>
                <button
                  onClick={() => setLanguage(language === "en" ? "id" : "en")}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-blue-500/10 hover:text-blue-700 transition-all cursor-pointer"
                >
                  <span className={language === "en" ? "font-bold text-blue-600" : ""}>EN</span>
                  <span className="text-slate-300">/</span>
                  <span className={language === "id" ? "font-bold text-blue-600" : ""}>ID</span>
                </button>
              </div>

              <hr className="my-2 border-slate-200/40" />
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full rounded-lg">
                  {t("navLogin")}
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full rounded-lg">
                  {t("navStartFree")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
