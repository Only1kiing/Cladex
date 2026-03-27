'use client';

import React from 'react';

type BadgeVariant = 'guardian' | 'analyst' | 'hunter' | 'oracle' | 'default';
type BadgeStatus = 'active' | 'inactive' | 'warning' | 'error' | 'success';

interface BadgeProps {
  variant?: BadgeVariant;
  status?: BadgeStatus;
  dot?: boolean;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  guardian: 'bg-guardian-500/15 text-guardian-400 border-guardian-500/20',
  analyst: 'bg-analyst-500/15 text-analyst-400 border-analyst-500/20',
  hunter: 'bg-hunter-500/15 text-hunter-400 border-hunter-500/20',
  oracle: 'bg-oracle-500/15 text-oracle-400 border-oracle-500/20',
  default: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
};

const statusStyles: Record<BadgeStatus, string> = {
  active: 'bg-guardian-500/15 text-guardian-400 border-guardian-500/20',
  inactive: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  error: 'bg-hunter-500/15 text-hunter-400 border-hunter-500/20',
  success: 'bg-guardian-500/15 text-guardian-400 border-guardian-500/20',
};

const dotColors: Record<BadgeVariant, string> = {
  guardian: 'bg-guardian-400',
  analyst: 'bg-analyst-400',
  hunter: 'bg-hunter-400',
  oracle: 'bg-oracle-400',
  default: 'bg-gray-400',
};

const statusDotColors: Record<BadgeStatus, string> = {
  active: 'bg-guardian-400 animate-pulse',
  inactive: 'bg-gray-500',
  warning: 'bg-amber-400',
  error: 'bg-hunter-400',
  success: 'bg-guardian-400',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

function Badge({
  variant,
  status,
  dot = false,
  size = 'md',
  children,
  className = '',
}: BadgeProps) {
  const style = status
    ? statusStyles[status]
    : variant
    ? variantStyles[variant]
    : variantStyles.default;

  const dotColor = status
    ? statusDotColors[status]
    : variant
    ? dotColors[variant]
    : dotColors.default;

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        'transition-colors duration-200',
        style,
        sizeStyles[size],
        className,
      ].join(' ')}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      )}
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant, BadgeStatus };
