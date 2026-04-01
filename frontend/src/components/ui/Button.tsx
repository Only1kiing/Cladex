'use client';

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[#B8FF3C]',
    'hover:brightness-110',
    'text-black font-bold shadow-lg shadow-[#B8FF3C]/15',
    'hover:shadow-[#B8FF3C]/25',
    'active:brightness-95',
    'disabled:bg-gray-600 disabled:shadow-none disabled:text-gray-400',
  ].join(' '),
  secondary: [
    'bg-surface border border-white/10',
    'hover:bg-white/5 hover:border-white/20',
    'text-gray-200',
    'active:bg-white/10',
    'disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700',
  ].join(' '),
  danger: [
    'bg-gradient-to-r from-apex-500 to-apex-600',
    'hover:from-apex-400 hover:to-apex-500',
    'text-white shadow-lg shadow-apex-500/25',
    'hover:shadow-apex-500/40',
    'active:from-apex-600 active:to-apex-700',
    'disabled:from-gray-600 disabled:to-gray-700 disabled:shadow-none',
  ].join(' '),
  ghost: [
    'bg-transparent',
    'hover:bg-white/5',
    'text-gray-300 hover:text-white',
    'active:bg-white/10',
    'disabled:text-gray-600 disabled:hover:bg-transparent',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-6 py-3 text-base gap-2.5 rounded-xl',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8FF3C]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-60',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? 'w-full' : '',
          className,
        ].join(' ')}
        {...props}
      >
        {loading && (
          <Loader2 className="animate-spin shrink-0" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
        )}
        {!loading && icon && iconPosition === 'left' && (
          <span className="shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && icon && iconPosition === 'right' && (
          <span className="shrink-0">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
