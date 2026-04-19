import type { PropsWithChildren, ReactNode } from 'react';
import { DashboardCard } from '@/components/ui/dashboard-card';

type PageHeaderProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  compact?: boolean;
}>;

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  compact = false,
  children,
}: PageHeaderProps) {
  return (
    <DashboardCard glow="blue" className={compact ? 'p-6 md:p-6' : 'p-7 md:p-8'}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className={compact ? 'space-y-3' : 'space-y-4'}>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7EA8E6]">
              {eyebrow}
            </p>
          ) : null}
          <div className={compact ? 'space-y-2' : 'space-y-3'}>
            <h1
              className={[
                'font-display font-semibold tracking-[-0.03em] text-[#F3F7FF]',
                compact ? 'text-[1.9rem] md:text-[2.35rem]' : 'text-3xl md:text-4xl',
              ].join(' ')}
            >
              {title}
            </h1>
            <p
              className={[
                'max-w-3xl text-sm text-[#A7B7D6]',
                compact ? 'leading-6' : 'leading-7',
              ].join(' ')}
            >
              {description}
            </p>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children ? <div className={compact ? 'mt-5' : 'mt-7'}>{children}</div> : null}
    </DashboardCard>
  );
}
