const fieldClass = "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary";

export function Field({ label, ...props }: React.ComponentProps<"input"> & { label: string }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold">
      {label}
      <input {...props} className={fieldClass} />
    </label>
  );
}

export function Select({ label, children, ...props }: React.ComponentProps<"select"> & { label: string }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold">
      {label}
      <select {...props} className={fieldClass}>{children}</select>
    </label>
  );
}

export function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}

export const card = "min-w-0 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm";
