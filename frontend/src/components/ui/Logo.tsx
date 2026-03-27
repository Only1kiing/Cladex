'use client';

import React from 'react';

interface LogoProps {
  size?: 'micro' | 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizes = {
    micro: { icon: 16, text: 14, gap: 'gap-1.5' },
    sm: { icon: 20, text: 16, gap: 'gap-1.5' },
    md: { icon: 26, text: 20, gap: 'gap-2' },
    lg: { icon: 36, text: 28, gap: 'gap-2.5' },
  };

  const s = sizes[size];

  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      {/* Claw mark icon */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 40 48"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <rect x="2" y="6" width="6" height="22" rx="3" fill="#B8FF3C" />
        <rect x="13" y="2" width="6" height="32" rx="3" fill="#B8FF3C" />
        <rect x="24" y="10" width="6" height="16" rx="3" fill="#B8FF3C" />
        <path d="M5 28 Q5 36 2 41" stroke="#B8FF3C" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M16 34 Q16 42 13 46" stroke="#B8FF3C" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M27 26 Q27 34 24 38" stroke="#B8FF3C" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </svg>
      {showText && (
        <span
          className="font-black tracking-wider text-white uppercase"
          style={{ fontSize: `${s.text}px` }}
        >
          CLADEX
        </span>
      )}
    </span>
  );
}

/** Icon-only version for favicons, badges, etc */
export function LogoIcon({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 70 70"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="70" height="70" rx="14" fill="#0F0F0F" />
      <rect x="14" y="12" width="8" height="28" rx="4" fill="#B8FF3C" />
      <rect x="27" y="8" width="8" height="40" rx="4" fill="#B8FF3C" />
      <rect x="40" y="16" width="8" height="22" rx="4" fill="#B8FF3C" />
      <path d="M18 40 Q18 50 13 56" stroke="#B8FF3C" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M31 48 Q31 58 26 63" stroke="#B8FF3C" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M44 38 Q44 48 39 53" stroke="#B8FF3C" strokeWidth="4.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
