import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, error, ...props }, ref) {
  return (
    <div className="space-y-1">
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200",
          error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200" : "",
          className,
        )}
        {...props}
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
});
