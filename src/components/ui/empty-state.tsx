import { Button, type ButtonProps } from "@/components/ui/button";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: ButtonProps & { label: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
      {icon ? <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">{icon}</div> : null}
      <h4 className="text-base font-semibold text-slate-900">{title}</h4>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {action ? (
        <div className="mt-4">
          <Button {...action}>{action.label}</Button>
        </div>
      ) : null}
    </div>
  );
}
