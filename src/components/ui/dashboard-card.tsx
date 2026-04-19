import type { ElementType, HTMLAttributes, ReactNode } from 'react';

type DashboardCardProps = HTMLAttributes<HTMLElement> & {
  as?: 'article' | 'section' | 'div';
  children: ReactNode;
  glow?: 'none' | 'blue' | 'green';
};

export function DashboardCard({
  as = 'section',
  children,
  className,
  glow = 'none',
  ...props
}: DashboardCardProps) {
  const Component = as as ElementType;
  const glowClassName =
    glow === 'blue'
      ? 'before:absolute before:inset-x-12 before:top-0 before:h-14 before:rounded-full before:bg-[#5BC0FF]/8 before:blur-3xl'
      : glow === 'green'
        ? 'before:absolute before:inset-x-12 before:top-0 before:h-14 before:rounded-full before:bg-[#4ADE80]/8 before:blur-3xl'
        : '';

  return (
    <Component
      className={[
        'motion-card-reveal relative overflow-hidden rounded-[18px] border border-white/[0.07] bg-[linear-gradient(180deg,#16203a_0%,#141d31_100%)] p-6 shadow-[0_20px_50px_-34px_rgba(4,9,23,0.95)]',
        glowClassName,
        className ?? '',
      ].join(' ')}
      {...props}
    >
      <div className="relative z-[1]">{children}</div>
    </Component>
  );
}
