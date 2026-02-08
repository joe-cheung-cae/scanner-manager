import * as React from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-200",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-sky-200",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-sky-200",
  danger: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-200",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", loading = false, leftIcon, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {!loading && leftIcon ? <span aria-hidden="true">{leftIcon}</span> : null}
      <span>{children}</span>
    </button>
  );
});
