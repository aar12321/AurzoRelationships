// Tiny placeholder primitive + a couple of reusable shapes. Prefer these
// over "Loading…" text — an empty-looking page that fills in feels faster
// and less broken than a spinner-and-wait pattern.

import type { HTMLAttributes } from 'react';

export function Skeleton({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={[
        'animate-pulse rounded-md bg-cream-200/70 dark:bg-charcoal-800',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}

// Silhouette of a typical dashboard card — matches card-journal height and
// shows a label-sized bar + three body lines of decreasing width.
export function CardSkeleton({ bodyLines = 3 }: { bodyLines?: number }) {
  const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/6'];
  return (
    <div className="card-journal" role="status" aria-label="Loading">
      <Skeleton className="h-3 w-24 mb-3" />
      <div className="space-y-2">
        {Array.from({ length: bodyLines }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${widths[i % widths.length]}`} />
        ))}
      </div>
    </div>
  );
}

// A person tile silhouette — avatar circle + name line + strength line.
export function PersonTileSkeleton() {
  return (
    <div className="card-journal" role="status" aria-label="Loading person">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
    </div>
  );
}
