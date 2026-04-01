'use client';

import React from 'react';

type BadgeVariant = 'nova' | 'sage' | 'apex' | 'echo' | 'default';
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
  nova: 'bg-nova-500/15 text-nova-400 border-nova-500/20',
  sage: 'bg-sage-500/15 text-sage-400 border-sage-500/20',
  apex: 'bg-apex-500/15 text-apex-400 border-apex-500/20',
  echo: 'bg-echo-500/15 text-echo-400 border-echo-500/20',
  default: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
};

const statusStyles: Record<BadgeStatus, string> = {
  active: 'bg-nova-500/15 text-nova-400 border-nova-500/20',
  inactive: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  error: 'bg-apex-500/15 text-apex-400 border-apex-500/20',
  success: 'bg-nova-500/15 text-nova-400 border-nova-500/20',
};

const dotColors: Record<BadgeVariant, string> = {
  nova: 'bg-nova-400',
  sage: 'bg-sage-400',
  apex: 'bg-apex-400',
  echo: 'bg-echo-400',
  default: 'bg-gray-400',
};

const statusDotColors: Record<BadgeStatus, string> = {
  active: 'bg-nova-400 animate-pulse',
  inactive: 'bg-gray-500',
  warning: 'bg-amber-400',
  error: 'bg-apex-400',
  success: 'bg-nova-400',
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
