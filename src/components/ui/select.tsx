import * as React from "react";
import { cn } from "@/lib/cn";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, error, ...props }, ref) {
  return (
    <div className="space-y-1">
      <select
        ref={ref}
        className={cn(
          "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200",
          error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200" : "",
          className,
        )}
        {...props}
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
});
