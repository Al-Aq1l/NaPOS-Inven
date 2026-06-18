"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";

// ===== Button =====
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)]",
    secondary:
      "bg-[var(--slate-100)] text-[var(--text-primary)] hover:bg-[var(--slate-200)] dark:bg-[var(--slate-800)] dark:hover:bg-[var(--slate-700)]",
    ghost:
      "text-[var(--text-secondary)] hover:bg-[var(--slate-100)] hover:text-[var(--text-primary)] dark:hover:bg-[var(--slate-800)]",
    danger:
      "bg-[var(--danger-500)] text-white hover:bg-[var(--danger-600)]",
    outline:
      "border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--slate-50)] hover:border-[var(--border-hover)] dark:hover:bg-[var(--slate-800)]",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}

// ===== Card =====
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  hover = false,
  padding = "md",
  children,
  className,
  ...props
}: CardProps) {
  const paddings = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };
  return (
    <div
      className={cn(
        "bg-[var(--surface)] border border-[var(--border)] rounded-lg",
        hover &&
          "transition-colors duration-150 hover:bg-[var(--surface-raised)] hover:border-[var(--border-hover)]",
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ===== Badge =====
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "brand";
  size?: "sm" | "md";
  dot?: boolean;
  pulse?: boolean;
}

export function Badge({
  variant = "default",
  size = "sm",
  dot = false,
  pulse = false,
  children,
  className,
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-slate-100/80 text-slate-600 ring-1 ring-inset ring-slate-200/70 dark:bg-slate-800/70 dark:text-slate-300 dark:ring-white/10",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/15",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/15",
    danger: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/15",
    info: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/15",
    brand: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/15",
  };

  const dotColors = {
    default: "bg-[var(--slate-400)]",
    success: "bg-[var(--success-500)]",
    warning: "bg-[var(--warning-500)]",
    danger: "bg-[var(--danger-500)]",
    info: "bg-[var(--brand-500)]",
    brand: "bg-[var(--brand-500)]",
  };

  const sizes = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
                dotColors[variant]
              )}
            />
          )}
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              dotColors[variant]
            )}
          />
        </span>
      )}
      {children}
    </span>
  );
}

// ===== Input =====
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-tertiary)]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-[var(--danger-500)] focus:ring-[var(--danger-500)]",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-tertiary)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-[var(--danger-500)]">{error}</p>}
        {hint && !error && (
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

// ===== Skeleton =====
interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton", className)}
      style={{ width, height: height || "16px" }}
    />
  );
}

// ===== Stat Card =====
interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon,
  className,
}: StatCardProps) {
  const changeColors = {
    positive: "text-[var(--success-500)]",
    negative: "text-[var(--danger-500)]",
    neutral: "text-[var(--text-tertiary)]",
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-[var(--text-secondary)]">{label}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {value}
          </p>
          {change && (
            <p className={cn("text-xs font-medium", changeColors[changeType])}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2.5 bg-[var(--surface-raised)] text-[var(--text-secondary)] rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ===== Connection Status =====
interface ConnectionStatusProps {
  isOnline: boolean;
  isSyncing?: boolean;
  className?: string;
}

export function ConnectionStatus({
  isOnline,
  isSyncing = false,
  className,
}: ConnectionStatusProps) {
  const status = isSyncing ? "syncing" : isOnline ? "online" : "offline";
  const config = {
    online: { label: "Online", variant: "success" as const },
    syncing: { label: "Syncing...", variant: "warning" as const },
    offline: { label: "Offline", variant: "danger" as const },
  };

  return (
    <Badge
      variant={config[status].variant}
      dot
      pulse={status !== "online"}
      className={className}
    >
      {config[status].label}
    </Badge>
  );
}

// ===== Modal =====
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  if (!open) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full bg-[var(--surface)] rounded-lg shadow-[var(--shadow-md)] flex flex-col max-h-[90vh] my-8",
          sizes[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-6 pb-0 flex-shrink-0">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--slate-100)] dark:hover:bg-[var(--slate-800)] transition-colors cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}

// ===== Drawer =====
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: "right" | "left";
}

export function Drawer({ open, onClose, title, children, side = "right" }: DrawerProps) {
  if (!open) return null;
  const positionClass = side === "right" ? "right-0" : "left-0";

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute inset-y-0 w-full max-w-sm bg-[var(--surface)] shadow-[var(--shadow-xl)] flex flex-col",
          positionClass
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--slate-100)] dark:hover:bg-[var(--slate-800)] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ===== Toast =====
interface ToastProps {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  visible: boolean;
}

const toastConfig = {
  success: {
    border: "border-l-emerald-500",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
    shadow: "shadow-[0_10px_25px_-5px_rgba(16,185,129,0.15)]",
  },
  error: {
    border: "border-l-rose-500",
    icon: <XCircle className="h-5 w-5 text-rose-500 shrink-0" />,
    shadow: "shadow-[0_10px_25px_-5px_rgba(244,63,94,0.15)]",
  },
  info: {
    border: "border-l-blue-500",
    icon: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
    shadow: "shadow-[0_10px_25px_-5px_rgba(59,130,246,0.15)]",
  },
  warning: {
    border: "border-l-amber-500",
    icon: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
    shadow: "shadow-[0_10px_25px_-5px_rgba(245,158,11,0.15)]",
  },
};

export function Toast({ message, type = "info", visible }: ToastProps) {
  if (!visible) return null;

  const cfg = toastConfig[type];
  const isShakeType = type === "warning" || type === "success";
  const animationValue = isShakeType
    ? "toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards, toast-shake 0.5s ease-in-out 0.35s"
    : "toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards";

  return (
    <>
      <style>{`
        @keyframes toast-slide-in {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes toast-shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-6px); }
          30%, 60%, 90% { transform: translateX(6px); }
        }
      `}</style>
      <div
        className="fixed top-6 right-6 z-[100] max-w-sm"
        style={{
          animation: animationValue,
        }}
      >
        <div
          className={cn(
            "flex items-start gap-3.5 px-4 py-3.5 rounded-xl border border-l-4 bg-[var(--surface)] border-[var(--border)] shadow-xl",
            cfg.border,
            cfg.shadow
          )}
        >
          <div className="mt-0.5">{cfg.icon}</div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              {type === "success" ? "Berhasil" : type === "error" ? "Gagal" : type === "warning" ? "Peringatan" : "Info"}
            </p>
            <p className="text-sm font-medium text-[var(--text-primary)] leading-normal break-words">
              {message}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ===== Avatar =====
interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={48}
        height={48}
        className={cn("rounded-full object-cover", sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-[var(--brand-100)] text-[var(--brand-700)] flex items-center justify-center font-semibold dark:bg-[var(--brand-900)] dark:text-[var(--brand-300)]",
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}

// ===== Data Table =====
interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data found",
  loading = false,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="40px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-raised)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider",
                    col.className
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-[var(--text-tertiary)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className={cn(
                    "transition-colors hover:bg-[var(--surface-raised)]",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-[var(--text-primary)]",
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(item)
                        : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
