type Props = {
  name: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
};

const SIZE = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-14 w-14 text-base',
  lg: 'h-24 w-24 text-2xl',
};

export default function PersonAvatar({ name, photoUrl, size = 'md', pulse }: Props) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div
      className={[
        'rounded-full overflow-hidden bg-gold-300 text-charcoal-900',
        'flex items-center justify-center font-serif select-none',
        pulse ? 'animate-warm-pulse' : '',
        SIZE[size],
      ].join(' ')}
      aria-hidden
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{initials || '·'}</span>
      )}
    </div>
  );
}
