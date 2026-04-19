import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type DashboardButtonVariant = 'primary' | 'secondary' | 'ghost';

type DashboardButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: DashboardButtonVariant;
};

type DashboardLinkButtonProps = LinkProps & {
  children: ReactNode;
  variant?: DashboardButtonVariant;
  className?: string;
};

export function DashboardButton({
  children,
  className,
  variant = 'primary',
  ...props
}: DashboardButtonProps) {
  return (
    <button
      className={[buttonClassNameByVariant[variant], className ?? ''].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}

export function DashboardLinkButton({
  children,
  className,
  variant = 'primary',
  ...props
}: DashboardLinkButtonProps) {
  return (
    <Link
      className={[buttonClassNameByVariant[variant], className ?? ''].join(' ')}
      {...props}
    >
      {children}
    </Link>
  );
}

const buttonClassNameByVariant: Record<DashboardButtonVariant, string> = {
  primary:
    'inline-flex min-h-[3.5rem] items-center justify-center gap-2.5 rounded-[16px] bg-gradient-to-r from-[#4A86FF] to-[#5BC0FF] px-6 py-3 text-[0.96rem] font-semibold text-[#08111F] shadow-[0_16px_32px_-22px_rgba(91,192,255,0.72)] transition-all duration-200 ease-in-out hover:-translate-y-[1px] hover:brightness-110 active:scale-[0.98]',
  secondary:
    'inline-flex min-h-[3.5rem] items-center justify-center gap-2.5 rounded-[16px] border border-white/[0.08] bg-[#18233E] px-6 py-3 text-[0.96rem] font-semibold text-[#EAF2FF] transition-all duration-200 ease-in-out hover:-translate-y-[1px] hover:border-white/[0.12] hover:bg-[#1B2947] hover:brightness-110 active:scale-[0.98]',
  ghost:
    'inline-flex min-h-[3.5rem] items-center justify-center gap-2.5 rounded-[16px] px-4 py-3 text-[0.96rem] font-semibold text-[#76CFFF] transition-all duration-200 ease-in-out hover:-translate-y-[1px] hover:bg-white/[0.04] hover:brightness-110 active:scale-[0.98]',
};
