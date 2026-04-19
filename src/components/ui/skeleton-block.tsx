import type { HTMLAttributes } from 'react';

type SkeletonBlockProps = HTMLAttributes<HTMLDivElement> & {
  shimmerClassName?: string;
};

export function SkeletonBlock({
  className,
  shimmerClassName,
  ...props
}: SkeletonBlockProps) {
  return (
    <div
      className={[
        'skeleton-block rounded-[14px] bg-white/[0.055]',
        shimmerClassName ?? '',
        className ?? '',
      ].join(' ')}
      aria-hidden="true"
      {...props}
    />
  );
}
