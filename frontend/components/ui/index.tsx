"use client";

import React from "react";
import { cn } from "@/lib/utils";

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
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

  const variants = {
    primary:
      "bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)] shadow-sm hover:shadow-md",
    secondary:
      "bg-[var(--slate-100)] text-[var(--text-primary)] hover:bg-[var(--slate-200)] dark:bg-[var(--slate-800)] dark:hover:bg-[var(--slate-700)]",
    ghost:
      "text-[var(--text-secondary)] hover:bg-[var(--slate-100)] hover:text-[var(--text-primary)] dark:hover:bg-[var(--slate-800)]",
    danger:
      "bg-[var(--danger-500)] text-white hover:bg-[var(--danger-600)] shadow-sm",
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
        "bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-xs)]",
        hover &&
          "transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-hover)] hover:-translate-y-0.5",
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
    default: "bg-[var(--slate-100)] text-[var(--slate-600)] dark:bg-[var(--slate-800)] dark:text-[var(--slate-300)]",
    success: "bg-[var(--success-50)] text-[var(--success-600)] dark:bg-green-900/30 dark:text-green-400",
    warning: "bg-[var(--warning-50)] text-[var(--warning-600)] dark:bg-amber-900/30 dark:text-amber-400",
    danger: "bg-[var(--danger-50)] text-[var(--danger-600)] dark:bg-red-900/30 dark:text-red-400",
    info: "bg-[var(--info-50)] text-[var(--brand-600)] dark:bg-blue-900/30 dark:text-blue-400",
    brand: "bg-[var(--brand-50)] text-[var(--brand-700)] dark:bg-blue-900/30 dark:text-blue-400",
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
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap",
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
    <Card hover className={cn("relative overflow-hidden", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-[var(--text-secondary)]">{label}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] animate-fade-in-up">
            {value}
          </p>
          {change && (
            <p className={cn("text-xs font-medium", changeColors[changeType])}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2.5 bg-[var(--brand-50)] text-[var(--brand-600)] rounded-lg dark:bg-[var(--brand-950)] dark:text-[var(--brand-400)]">
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
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  if (!open) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full mx-4 bg-[var(--surface)] rounded-xl shadow-[var(--shadow-xl)] animate-scale-in",
          sizes[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-6 pb-0">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--slate-100)] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
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

export function Toast({ message, type = "info", visible }: ToastProps) {
  if (!visible) return null;

  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ",
    warning: "⚠",
  };

  const colors = {
    success: "bg-[var(--success-500)]",
    error: "bg-[var(--danger-500)]",
    info: "bg-[var(--brand-600)]",
    warning: "bg-[var(--warning-500)]",
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-slide-in-right">
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg text-white shadow-[var(--shadow-lg)]",
          colors[type]
        )}
      >
        <span className="text-lg">{icons[type]}</span>
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
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
      <img
        src={src}
        alt={name}
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
      <div className="border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="40px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
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
