type Props = {
  label: string;
  hint?: string;
  children: React.ReactNode;
};

export default function FieldRow({ label, hint, children }: Props) {
  return (
    <label className="block">
      <span className="text-sm text-charcoal-500">{label}</span>
      {hint && <span className="block text-xs text-charcoal-500/70">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const inputClass =
  'w-full rounded-journal border border-cream-200 bg-ivory-50 ' +
  'px-3 py-2 text-charcoal-900 placeholder:text-charcoal-500/60 ' +
  'focus:outline-none focus:border-terracotta-500';
