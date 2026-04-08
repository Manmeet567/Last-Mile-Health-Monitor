import type { PropsWithChildren, ReactNode } from 'react';

type PageHeaderProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}>;

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-300">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold text-white">{title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-300">{description}</p>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}
