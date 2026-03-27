'use client';

import React from 'react';
import type { AgentPersonality } from '@/types';

interface AgentAvatarProps {
  personality: AgentPersonality;
  size?: number;
  className?: string;
  active?: boolean;
}

// Guardian (Knox) — The Don / Godfather: Fedora, dark suit, green tie, shield lapel pin
function GuardianFace({ size, active }: { size: number; active: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="gf-bg" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0a0a0f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gf-skin" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#8B5E3C" />
          <stop offset="100%" stopColor="#5C3A1E" />
        </linearGradient>
        <linearGradient id="gf-suit" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#0d0d15" />
        </linearGradient>
        <linearGradient id="gf-hat" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#2a2a3e" />
          <stop offset="100%" stopColor="#16161d" />
        </linearGradient>
        <filter id="gf-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#22c55e" floodOpacity="0.35" />
        </filter>
        <filter id="gf-hat-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#22c55e" floodOpacity="0.25" />
        </filter>
      </defs>
      {/* Background ambient glow */}
      <circle cx="60" cy="60" r="56" fill="url(#gf-bg)" />
      {active && <circle cx="60" cy="60" r="55" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.1" fill="none">
        <animate attributeName="r" values="53;56;53" dur="4s" repeatCount="indefinite" />
        <animate attributeName="strokeOpacity" values="0.08;0.18;0.08" dur="4s" repeatCount="indefinite" />
      </circle>}
      {/* Body — Dark suit with broad shoulders */}
      <path d="M22 120 Q26 88, 40 82 L48 80 L60 78 L72 80 L80 82 Q94 88, 98 120 Z" fill="url(#gf-suit)" />
      {/* Suit lapels */}
      <path d="M48 80 L54 92 L60 80" fill="#222238" stroke="#2a2a40" strokeWidth="0.5" />
      <path d="M72 80 L66 92 L60 80" fill="#222238" stroke="#2a2a40" strokeWidth="0.5" />
      {/* Green tie */}
      <path d="M58 80 L60 78 L62 80 L61 96 L60 98 L59 96 Z" fill="#22c55e" opacity="0.85" />
      <path d="M58.5 80 L60 78.5 L61.5 80 L61 83 L59 83 Z" fill="#4ade80" opacity="0.6" />
      {/* Shield lapel pin */}
      <path d="M50 84 L52 82 L54 84 L54 87 C54 88.5, 52 89.5, 52 89.5 C52 89.5, 50 88.5, 50 87 Z" fill="#4ade80" opacity="0.5" />
      <circle cx="52" cy="85.5" r="0.8" fill="#86efac" opacity="0.7" />
      {/* Shirt collar */}
      <path d="M50 79 L56 77 L60 78 L64 77 L70 79 L66 82 L60 80 L54 82 Z" fill="#e8e8e8" opacity="0.15" />
      {/* Neck */}
      <rect x="54" y="72" width="12" height="8" rx="3" fill="url(#gf-skin)" opacity="0.9" />
      {/* Face — strong jawline, oval with angular jaw */}
      <path d="M38 52 Q38 30, 60 28 Q82 30, 82 52 Q82 64, 74 70 L66 74 Q60 76, 54 74 L46 70 Q38 64, 38 52 Z" fill="url(#gf-skin)" filter="url(#gf-glow)" />
      {/* Jaw shadow for definition */}
      <path d="M42 62 Q48 68, 60 70 Q72 68, 78 62 Q76 66, 70 72 L66 74 Q60 76, 54 74 L50 72 Q44 66, 42 62 Z" fill="#3D2610" opacity="0.3" />
      {/* Eyes — calm, confident, slightly narrowed */}
      <ellipse cx="48" cy="50" rx="5" ry="3.5" fill="#1a1a2e" />
      <ellipse cx="72" cy="50" rx="5" ry="3.5" fill="#1a1a2e" />
      <circle r="2" fill="#2d6a4f">
        <animate attributeName="cx" values="49;51;49;47;49" dur="5s" repeatCount="indefinite" />
        <animate attributeName="cy" values="49.5;50.5;49.5;49;49.5" dur="5s" repeatCount="indefinite" />
      </circle>
      <circle r="2" fill="#2d6a4f">
        <animate attributeName="cx" values="73;75;73;71;73" dur="5s" repeatCount="indefinite" />
        <animate attributeName="cy" values="49.5;50.5;49.5;49;49.5" dur="5s" repeatCount="indefinite" />
      </circle>
      <circle r="0.8" fill="#fff" opacity="0.9">
        <animate attributeName="cx" values="49.5;51.5;49.5;47.5;49.5" dur="5s" repeatCount="indefinite" />
        <animate attributeName="cy" values="49;50;49;48.5;49" dur="5s" repeatCount="indefinite" />
      </circle>
      <circle r="0.8" fill="#fff" opacity="0.9">
        <animate attributeName="cx" values="73.5;75.5;73.5;71.5;73.5" dur="5s" repeatCount="indefinite" />
        <animate attributeName="cy" values="49;50;49;48.5;49" dur="5s" repeatCount="indefinite" />
      </circle>
      {/* Eyelids — heavy, confident */}
      <path d="M42 48 Q48 46, 54 48" fill="#5C3A1E" opacity="0.5" />
      <path d="M66 48 Q72 46, 78 48" fill="#5C3A1E" opacity="0.5" />
      {/* Eyebrows — thick, authoritative */}
      <path d="M41 44 Q47 41, 55 43.5" stroke="#3d2b1f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M65 43.5 Q73 41, 79 44" stroke="#3d2b1f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Nose — broad, strong */}
      <path d="M57 50 L56 57 Q57.5 60, 60 61 Q62.5 60, 64 57 L63 50" stroke="#4A2E14" strokeWidth="0.8" fill="none" opacity="0.4" />
      <ellipse cx="60" cy="60.5" rx="4" ry="2" fill="#4A2E14" opacity="0.15" />
      {/* Mouth — full lips, confident */}
      <path d="M51 64 Q55 67, 60 66.5 Q65 66, 69 64" stroke="#6B3D20" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M53 65 Q57 67.5, 60 67 Q63 66.5, 67 65" fill="#7A4528" opacity="0.3" />
      <path d="M52 64.5 Q56 66.5, 60 66 Q64 65.5, 68 64.5" stroke="#a0785c" strokeWidth="0.5" fill="none" strokeLinecap="round" opacity="0.3" />
      {/* Ears */}
      <ellipse cx="37" cy="52" rx="3" ry="5" fill="#5C3A1E" opacity="0.7" />
      <ellipse cx="83" cy="52" rx="3" ry="5" fill="#5C3A1E" opacity="0.7" />
      {/* Hair — dark, combed back visible under hat */}
      <path d="M40 42 Q42 34, 60 32 Q78 34, 80 42 Q78 38, 60 36 Q42 38, 40 42 Z" fill="#1a1008" />
      {/* Fedora hat */}
      <path d="M20 38 Q22 22, 60 18 Q98 22, 100 38 L96 42 Q80 32, 60 30 Q40 32, 24 42 Z" fill="url(#gf-hat)" filter="url(#gf-hat-glow)" />
      {/* Hat brim */}
      <ellipse cx="60" cy="38" rx="40" ry="8" fill="#1e1e2c" />
      <ellipse cx="60" cy="37.5" rx="38" ry="6" fill="url(#gf-hat)" />
      {/* Hat crown visible above brim */}
      <path d="M34 37 Q36 18, 60 14 Q84 18, 86 37" fill="url(#gf-hat)" />
      <path d="M36 36 Q38 20, 60 16 Q82 20, 84 36" fill="#222236" />
      {/* Green hat band */}
      <rect x="34" y="32" width="52" height="4" rx="1" fill="#22c55e" opacity="0.7" />
      <rect x="34" y="33" width="52" height="1.5" rx="0.5" fill="#4ade80" opacity="0.3" />
      {/* Hat band highlight */}
      <rect x="42" y="32.5" width="8" height="3" rx="1" fill="#86efac" opacity="0.15" />
      {/* Active: green pulse around fedora */}
      {active && <>
        <ellipse cx="60" cy="26" rx="42" ry="18" stroke="#22c55e" strokeWidth="1" fill="none" opacity="0.12">
          <animate attributeName="ry" values="18;20;18" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.08;0.18;0.08" dur="3s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="60" cy="26" rx="46" ry="22" stroke="#4ade80" strokeWidth="0.5" fill="none" opacity="0.06">
          <animate attributeName="ry" values="22;24;22" dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.04;0.1;0.04" dur="3.5s" repeatCount="indefinite" />
        </ellipse>
      </>}
      {/* Five o'clock shadow */}
      <path d="M44 62 Q50 68, 60 69 Q70 68, 76 62 Q74 66, 68 70 Q60 72, 52 70 Q46 66, 44 62 Z" fill="#3d2b1f" opacity="0.06" />
    </svg>
  );
}

// Analyst (Byte) — The Strategist / Professor: Round glasses, slicked hair, turtleneck
function AnalystFace({ size, active }: { size: number; active: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="af-bg" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0a0a0f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="af-skin" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#F5DEB3" />
          <stop offset="100%" stopColor="#D4A574" />
        </linearGradient>
        <linearGradient id="af-turtleneck" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="af-lens" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#1d4ed8" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.2" />
        </linearGradient>
        <filter id="af-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#3b82f6" floodOpacity="0.35" />
        </filter>
        <filter id="af-glass-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#60a5fa" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Background ambient glow */}
      <circle cx="60" cy="60" r="56" fill="url(#af-bg)" />
      {/* Body — Dark turtleneck sweater */}
      <path d="M24 120 Q28 90, 42 84 L50 82 L60 80 L70 82 L78 84 Q92 90, 96 120 Z" fill="url(#af-turtleneck)" />
      {/* Turtleneck collar fold */}
      <path d="M48 78 Q54 76, 60 76 Q66 76, 72 78 L70 84 Q65 82, 60 82 Q55 82, 50 84 Z" fill="#2a3650" />
      <path d="M50 80 Q55 78, 60 78 Q65 78, 70 80 L69 83 Q64 81, 60 81 Q56 81, 51 83 Z" fill="#334563" opacity="0.5" />
      {/* Sweater texture lines */}
      <path d="M38 95 Q60 88, 82 95" stroke="#1e293b" strokeWidth="0.5" fill="none" opacity="0.3" />
      <path d="M34 102 Q60 94, 86 102" stroke="#1e293b" strokeWidth="0.5" fill="none" opacity="0.3" />
      {/* Neck */}
      <rect x="54" y="72" width="12" height="7" rx="3" fill="url(#af-skin)" opacity="0.85" />
      {/* Face — intelligent, slightly narrower */}
      <path d="M40 50 Q40 30, 60 28 Q80 30, 80 50 Q80 62, 72 68 L66 72 Q60 74, 54 72 L48 68 Q40 62, 40 50 Z" fill="url(#af-skin)" filter="url(#af-glow)" />
      {/* Jaw shadow */}
      <path d="M44 60 Q52 66, 60 67 Q68 66, 76 60 Q74 64, 68 70 Q60 72, 52 70 Q46 64, 44 60 Z" fill="#b08a5e" opacity="0.15" />
      {/* Slicked-back hair */}
      <path d="M38 46 Q40 24, 60 20 Q80 24, 82 46 Q80 28, 60 24 Q40 28, 38 46 Z" fill="#1a1008" />
      <path d="M36 48 Q38 22, 60 18 Q82 22, 84 48 Q82 26, 60 22 Q38 26, 36 48 Z" fill="#2a1a0e" opacity="0.7" />
      {/* Hair sides — neat and trimmed */}
      <path d="M38 46 Q36 50, 38 54 Q38 48, 40 44 Z" fill="#1a1008" />
      <path d="M82 46 Q84 50, 82 54 Q82 48, 80 44 Z" fill="#1a1008" />
      {/* Round glasses with blue lens reflection */}
      <circle cx="48" cy="50" r="9" fill="url(#af-lens)" stroke="#94a3b8" strokeWidth="1.8" filter="url(#af-glass-glow)" />
      <circle cx="72" cy="50" r="9" fill="url(#af-lens)" stroke="#94a3b8" strokeWidth="1.8" filter="url(#af-glass-glow)" />
      {/* Glasses bridge */}
      <path d="M57 50 Q60 48, 63 50" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
      {/* Glasses arms */}
      <line x1="39" y1="49" x2="34" y2="48" stroke="#94a3b8" strokeWidth="1.2" />
      <line x1="81" y1="49" x2="86" y2="48" stroke="#94a3b8" strokeWidth="1.2" />
      {/* Lens reflection arcs */}
      <path d="M42 46 Q45 44, 48 45" stroke="#60a5fa" strokeWidth="0.8" fill="none" opacity="0.4" />
      <path d="M66 46 Q69 44, 72 45" stroke="#60a5fa" strokeWidth="0.8" fill="none" opacity="0.4" />
      {/* Eyes behind glasses — focused, intelligent, looking around */}
      <ellipse cx="48" cy="50" rx="3.5" ry="3" fill="#1a1a2e" />
      <ellipse cx="72" cy="50" rx="3.5" ry="3" fill="#1a1a2e" />
      <circle r="1.8" fill="#3b82f6">
        <animate attributeName="cx" values="48.5;50.5;48.5;46.5;48.5" dur="4s" repeatCount="indefinite" />
        <animate attributeName="cy" values="49.5;50.5;49.5;49;49.5" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle r="1.8" fill="#3b82f6">
        <animate attributeName="cx" values="72.5;74.5;72.5;70.5;72.5" dur="4s" repeatCount="indefinite" />
        <animate attributeName="cy" values="49.5;50.5;49.5;49;49.5" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle r="0.7" fill="#fff" opacity="0.9">
        <animate attributeName="cx" values="49;51;49;47;49" dur="4s" repeatCount="indefinite" />
        <animate attributeName="cy" values="49;50;49;48.5;49" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle r="0.7" fill="#fff" opacity="0.9">
        <animate attributeName="cx" values="73;75;73;71;73" dur="4s" repeatCount="indefinite" />
        <animate attributeName="cy" values="49;50;49;48.5;49" dur="6s" repeatCount="indefinite" />
      </circle>
      {/* Eyebrows — slightly raised, thoughtful */}
      <path d="M39 40 Q45 37, 53 39" stroke="#2a1a0e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M67 39 Q75 37, 81 40" stroke="#2a1a0e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Nose — refined */}
      <path d="M58 48 L57.5 56 Q59 58, 60 58.5 Q61 58, 62.5 56 L62 48" stroke="#b08a5e" strokeWidth="0.6" fill="none" opacity="0.4" />
      <ellipse cx="60" cy="58" rx="2.5" ry="1.2" fill="#b08a5e" opacity="0.15" />
      {/* Mouth — knowing half-smile */}
      <path d="M52 63 Q58 65, 60 64.5 Q64 63, 68 64" stroke="#8b6d54" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Ears */}
      <ellipse cx="37" cy="50" rx="3" ry="5" fill="#c9a076" opacity="0.6" />
      <ellipse cx="83" cy="50" rx="3" ry="5" fill="#c9a076" opacity="0.6" />
      {/* Active: floating holographic data lines beside head */}
      {active && <>
        {/* Left holographic panel */}
        <g opacity="0.5">
          <rect x="6" y="34" width="22" height="16" rx="2" fill="#1e3a5f" fillOpacity="0.5" stroke="#3b82f6" strokeWidth="0.5">
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite" />
          </rect>
          <line x1="9" y1="38" x2="22" y2="38" stroke="#60a5fa" strokeWidth="0.8" opacity="0.6">
            <animate attributeName="x2" values="18;24;18" dur="3s" repeatCount="indefinite" />
          </line>
          <line x1="9" y1="41" x2="19" y2="41" stroke="#3b82f6" strokeWidth="0.6" opacity="0.4" />
          <line x1="9" y1="44" x2="16" y2="44" stroke="#60a5fa" strokeWidth="0.5" opacity="0.3" />
          <polyline points="10,47 14,43 17,45 20,40 24,42" stroke="#60a5fa" strokeWidth="0.8" fill="none" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.5s" repeatCount="indefinite" />
          </polyline>
        </g>
        {/* Right holographic panel */}
        <g opacity="0.5">
          <rect x="92" y="38" width="18" height="12" rx="2" fill="#1e3a5f" fillOpacity="0.4" stroke="#3b82f6" strokeWidth="0.4">
            <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3.5s" repeatCount="indefinite" />
          </rect>
          <circle cx="97" cy="43" r="1" fill="#60a5fa" opacity="0.6" />
          <circle cx="101" cy="43" r="1.5" fill="#3b82f6" opacity="0.4" />
          <circle cx="106" cy="43" r="0.8" fill="#93c5fd" opacity="0.5" />
          <line x1="95" y1="47" x2="107" y2="47" stroke="#60a5fa" strokeWidth="0.5" opacity="0.4" />
        </g>
        {/* Floating data particle */}
        <circle cx="16" cy="28" r="1.5" fill="#60a5fa" opacity="0.3">
          <animate attributeName="cy" values="28;24;28" dur="5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="5s" repeatCount="indefinite" />
        </circle>
      </>}
    </svg>
  );
}

// Hunter (Raze) — The Hitman / John Wick: Slicked dark hair, stubble, tactical suit, scar
function HunterFace({ size, active }: { size: number; active: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="hf-bg" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0a0a0f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hf-skin" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#C68642" />
          <stop offset="100%" stopColor="#8D5524" />
        </linearGradient>
        <linearGradient id="hf-suit" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#1a1a1e" />
          <stop offset="100%" stopColor="#0a0a0c" />
        </linearGradient>
        <filter id="hf-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#ef4444" floodOpacity="0.4" />
        </filter>
        <filter id="hf-scar-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="#ef4444" floodOpacity="0.2" />
        </filter>
      </defs>
      {/* Background ambient glow */}
      <circle cx="60" cy="60" r="56" fill="url(#hf-bg)" />
      {active && <circle cx="60" cy="60" r="54" stroke="#ef4444" strokeWidth="0.8" strokeOpacity="0.1" fill="none">
        <animate attributeName="strokeOpacity" values="0.05;0.15;0.05" dur="2s" repeatCount="indefinite" />
      </circle>}
      {/* Body — Black tactical suit */}
      <path d="M22 120 Q26 88, 40 82 L48 80 L60 78 L72 80 L80 82 Q94 88, 98 120 Z" fill="url(#hf-suit)" />
      {/* Tactical suit collar — high, clean */}
      <path d="M46 80 L52 76 L60 75 L68 76 L74 80 L70 84 L60 82 L50 84 Z" fill="#222225" />
      {/* Red accent line on collar */}
      <line x1="46" y1="80" x2="52" y2="76" stroke="#ef4444" strokeWidth="1" opacity="0.5" />
      <line x1="74" y1="80" x2="68" y2="76" stroke="#ef4444" strokeWidth="1" opacity="0.5" />
      {/* Red accent trim on shoulders */}
      <path d="M40 82 L36 86" stroke="#ef4444" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />
      <path d="M80 82 L84 86" stroke="#ef4444" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />
      {/* Suit seam lines */}
      <line x1="60" y1="82" x2="60" y2="110" stroke="#1a1a1e" strokeWidth="0.8" opacity="0.3" />
      {/* Neck — thick */}
      <rect x="52" y="70" width="16" height="8" rx="4" fill="url(#hf-skin)" opacity="0.9" />
      {/* Face — sharp angular, strong */}
      <path d="M36 48 Q36 28, 60 26 Q84 28, 84 48 Q84 62, 74 68 L66 72 Q60 74, 54 72 L46 68 Q36 62, 36 48 Z" fill="url(#hf-skin)" filter="url(#hf-glow)" />
      {/* Strong jawline shadows */}
      <path d="M40 58 Q46 66, 60 68 Q74 66, 80 58 Q78 64, 72 70 L66 72 Q60 74, 54 72 L48 70 Q42 64, 40 58 Z" fill="#9a7a56" opacity="0.2" />
      {/* Stubble texture — dots across jaw */}
      <circle cx="46" cy="64" r="0.4" fill="#4A2810" opacity="0.3" />
      <circle cx="50" cy="66" r="0.4" fill="#4A2810" opacity="0.25" />
      <circle cx="54" cy="67" r="0.4" fill="#4A2810" opacity="0.3" />
      <circle cx="58" cy="68" r="0.3" fill="#4A2810" opacity="0.25" />
      <circle cx="62" cy="68" r="0.3" fill="#4A2810" opacity="0.25" />
      <circle cx="66" cy="67" r="0.4" fill="#4A2810" opacity="0.3" />
      <circle cx="70" cy="66" r="0.4" fill="#4A2810" opacity="0.25" />
      <circle cx="74" cy="64" r="0.4" fill="#4A2810" opacity="0.3" />
      <circle cx="48" cy="62" r="0.3" fill="#4A2810" opacity="0.2" />
      <circle cx="72" cy="62" r="0.3" fill="#4A2810" opacity="0.2" />
      <circle cx="52" cy="65" r="0.3" fill="#4A2810" opacity="0.2" />
      <circle cx="68" cy="65" r="0.3" fill="#4A2810" opacity="0.2" />
      {/* Hair — slicked back, dark, sharp */}
      <path d="M36 48 Q38 24, 60 20 Q82 24, 84 48 Q82 30, 60 26 Q38 30, 36 48 Z" fill="#0d0d0d" />
      <path d="M34 50 Q36 22, 60 18 Q84 22, 86 50 Q84 28, 60 22 Q36 28, 34 50 Z" fill="#1a1a1a" opacity="0.8" />
      {/* Hair sheen */}
      <path d="M48 26 Q54 22, 62 24" stroke="#333" strokeWidth="1" fill="none" opacity="0.3" />
      {/* Hair sides */}
      <path d="M36 48 Q34 52, 36 56 Q36 50, 38 46 Z" fill="#0d0d0d" />
      <path d="M84 48 Q86 52, 84 56 Q84 50, 82 46 Z" fill="#0d0d0d" />
      {/* Scar across right eyebrow */}
      <line x1="66" y1="38" x2="78" y2="52" stroke="#A0714E" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" filter="url(#hf-scar-glow)" />
      <line x1="66" y1="38" x2="78" y2="52" stroke="#C08860" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      {/* Eyes — intense, slightly narrowed */}
      <path d="M42 48 Q48 44, 55 48 Q48 51, 42 48 Z" fill="#1a1a1e" />
      <path d="M65 48 Q72 44, 78 48 Q72 51, 65 48 Z" fill="#1a1a1e" />
      <circle r="2.2" fill="#7f1d1d">
        <animate attributeName="cx" values="49;51;49;47;49" dur="3s" repeatCount="indefinite" />
        <animate attributeName="cy" values="48;48.5;48;47.5;48" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle r="2.2" fill="#7f1d1d">
        <animate attributeName="cx" values="72;74;72;70;72" dur="3s" repeatCount="indefinite" />
        <animate attributeName="cy" values="48;48.5;48;47.5;48" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle r="1.2" fill="#ef4444">
        <animate attributeName="cx" values="49;51;49;47;49" dur="3s" repeatCount="indefinite" />
        <animate attributeName="cy" values="47.5;48;47.5;47;47.5" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle r="1.2" fill="#ef4444">
        <animate attributeName="cx" values="72;74;72;70;72" dur="3s" repeatCount="indefinite" />
        <animate attributeName="cy" values="47.5;48;47.5;47;47.5" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle r="0.5" fill="#fff" opacity="0.8">
        <animate attributeName="cx" values="49.5;51.5;49.5;47.5;49.5" dur="3s" repeatCount="indefinite" />
        <animate attributeName="cy" values="47;47.5;47;46.5;47" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle r="0.5" fill="#fff" opacity="0.8">
        <animate attributeName="cx" values="72.5;74.5;72.5;70.5;72.5" dur="3s" repeatCount="indefinite" />
        <animate attributeName="cy" values="47;47.5;47;46.5;47" dur="3s" repeatCount="indefinite" />
      </circle>
      {active && <>
        <circle cx="49" cy="48" r="2.2" fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.3">
          <animate attributeName="r" values="2.2;3;2.2" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
      </>}
      {/* Eyebrows — sharp, aggressive */}
      <path d="M40 42 Q47 38, 55 41" stroke="#1a1008" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M65 41 Q73 38, 80 42" stroke="#1a1008" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Nose — sharp, angular */}
      <path d="M58 46 L57 56 Q59 58, 60 58 Q61 58, 63 56 L62 46" stroke="#9a7a56" strokeWidth="0.7" fill="none" opacity="0.4" />
      {/* Mouth — stern, thin, determined */}
      <path d="M50 62 Q56 63, 60 62.5 Q64 62, 70 62" stroke="#8b6d54" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Ears */}
      <ellipse cx="35" cy="50" rx="3" ry="5" fill="#c09a6e" opacity="0.6" />
      <ellipse cx="85" cy="50" rx="3" ry="5" fill="#c09a6e" opacity="0.6" />
      {/* Active: red lightning sparks */}
      {active && <>
        {/* Lightning bolt left */}
        <path d="M20 30 L24 36 L22 36 L28 44" stroke="#ef4444" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5">
          <animate attributeName="opacity" values="0;0.7;0" dur="1.8s" repeatCount="indefinite" />
        </path>
        {/* Lightning bolt right */}
        <path d="M100 34 L96 40 L98 40 L92 48" stroke="#ef4444" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4">
          <animate attributeName="opacity" values="0.4;0;0.4" dur="2.2s" repeatCount="indefinite" />
        </path>
        {/* Spark particles */}
        <circle cx="16" cy="42" r="1.5" fill="#f87171" opacity="0.3">
          <animate attributeName="opacity" values="0;0.5;0" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="104" cy="28" r="1" fill="#fca5a5" opacity="0.2">
          <animate attributeName="opacity" values="0.2;0;0.2" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="26" cy="22" r="0.8" fill="#f87171" opacity="0.25">
          <animate attributeName="opacity" values="0;0.4;0" dur="1.2s" repeatCount="indefinite" />
        </circle>
        {/* Red energy crackling around body */}
        <path d="M32 88 L34 84 L33 84 L36 80" stroke="#ef4444" strokeWidth="0.6" fill="none" opacity="0.2">
          <animate attributeName="opacity" values="0;0.3;0" dur="2.5s" repeatCount="indefinite" />
        </path>
      </>}
    </svg>
  );
}

// Oracle (Iris) — The Mystic / Fortune Teller: Hooded cloak, third eye, crystal pendant
function OracleFace({ size, active }: { size: number; active: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="of-bg" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0a0a0f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="of-skin" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#D4A87C" />
          <stop offset="100%" stopColor="#A67B5B" />
        </linearGradient>
        <linearGradient id="of-cloak" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#2d1854" />
          <stop offset="100%" stopColor="#150a2e" />
        </linearGradient>
        <radialGradient id="of-eye3" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5f3ff" />
          <stop offset="40%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
        <radialGradient id="of-crystal" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
        <filter id="of-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#a855f7" floodOpacity="0.4" />
        </filter>
        <filter id="of-crystal-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#c084fc" floodOpacity="0.5" />
        </filter>
        <filter id="of-eye3-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#a855f7" floodOpacity="0.6" />
        </filter>
      </defs>
      {/* Background ambient glow */}
      <circle cx="60" cy="60" r="56" fill="url(#of-bg)" />
      {/* Floating mystical particles background */}
      {active && <>
        <circle cx="60" cy="55" r="52" stroke="#a855f7" strokeWidth="0.3" strokeOpacity="0.08" strokeDasharray="1.5 4" fill="none">
          <animateTransform attributeName="transform" type="rotate" dur="30s" from="0 60 55" to="360 60 55" repeatCount="indefinite" />
        </circle>
      </>}
      {/* Body — Hooded cloak */}
      <path d="M18 120 Q22 86, 38 80 L48 78 L60 76 L72 78 L82 80 Q98 86, 102 120 Z" fill="url(#of-cloak)" />
      {/* Cloak folds */}
      <path d="M36 90 Q42 86, 46 90" stroke="#3d1f6e" strokeWidth="0.8" fill="none" opacity="0.4" />
      <path d="M74 90 Q78 86, 84 90" stroke="#3d1f6e" strokeWidth="0.8" fill="none" opacity="0.4" />
      <line x1="60" y1="78" x2="60" y2="115" stroke="#3d1f6e" strokeWidth="0.6" opacity="0.3" />
      {/* Purple trim on cloak edges */}
      <path d="M18 120 Q22 86, 38 80" stroke="#a855f7" strokeWidth="1.2" fill="none" opacity="0.3" />
      <path d="M102 120 Q98 86, 82 80" stroke="#a855f7" strokeWidth="1.2" fill="none" opacity="0.3" />
      {/* Crystal pendant on chest */}
      <line x1="60" y1="78" x2="60" y2="86" stroke="#c084fc" strokeWidth="0.8" opacity="0.5" />
      <path d="M56 86 L60 82 L64 86 L60 94 Z" fill="url(#of-crystal)" filter="url(#of-crystal-glow)" opacity="0.7">
        {active && <animate attributeName="opacity" values="0.5;0.85;0.5" dur="4s" repeatCount="indefinite" />}
      </path>
      <path d="M58 85 L60 83 L62 85 L60 89 Z" fill="#e9d5ff" opacity="0.3" />
      {/* Neck */}
      <rect x="54" y="70" width="12" height="7" rx="3" fill="url(#of-skin)" opacity="0.8" />
      {/* Face — ethereal, luminous */}
      <path d="M40 50 Q40 32, 60 30 Q80 32, 80 50 Q80 62, 72 68 L66 72 Q60 74, 54 72 L48 68 Q40 62, 40 50 Z" fill="url(#of-skin)" filter="url(#of-glow)" />
      {/* Ethereal face glow */}
      <ellipse cx="60" cy="52" rx="18" ry="16" fill="#e9d5ff" opacity="0.08" />
      {/* Hood */}
      <path d="M24 60 Q26 14, 60 8 Q94 14, 96 60 Q94 40, 82 34 Q70 30, 60 30 Q50 30, 38 34 Q26 40, 24 60 Z" fill="url(#of-cloak)" />
      {/* Hood inner shadow */}
      <path d="M30 56 Q32 20, 60 14 Q88 20, 90 56 Q88 36, 78 32 Q68 28, 60 28 Q52 28, 42 32 Q32 36, 30 56 Z" fill="#1a0e30" opacity="0.5" />
      {/* Hood purple trim */}
      <path d="M24 60 Q26 14, 60 8 Q94 14, 96 60" stroke="#a855f7" strokeWidth="1.5" fill="none" opacity="0.35" />
      <path d="M26 58 Q28 16, 60 10 Q92 16, 94 58" stroke="#c084fc" strokeWidth="0.5" fill="none" opacity="0.15" />
      {/* Third eye on forehead */}
      <g filter="url(#of-eye3-glow)">
        <ellipse cx="60" cy="38" rx="5" ry="3.5" fill="url(#of-eye3)" />
        <ellipse cx="60" cy="38" rx="3" ry="2" fill="#c084fc" opacity="0.5" />
        <circle cx="60" cy="38" r="1.5" fill="#f5f3ff">
          {active && <animate attributeName="r" values="1.5;2.5;1.5" dur="3s" repeatCount="indefinite" />}
        </circle>
        <circle cx="60" cy="38" r="0.5" fill="#fff" />
      </g>
      {/* Third eye rays */}
      {active && <g opacity="0.2">
        <line x1="60" y1="32" x2="60" y2="28" stroke="#c084fc" strokeWidth="0.8" strokeLinecap="round">
          <animate attributeName="opacity" values="0.1;0.4;0.1" dur="3s" repeatCount="indefinite" />
        </line>
        <line x1="54" y1="34" x2="51" y2="30" stroke="#c084fc" strokeWidth="0.6" strokeLinecap="round">
          <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2.5s" repeatCount="indefinite" />
        </line>
        <line x1="66" y1="34" x2="69" y2="30" stroke="#c084fc" strokeWidth="0.6" strokeLinecap="round">
          <animate attributeName="opacity" values="0.1;0.3;0.1" dur="3.5s" repeatCount="indefinite" />
        </line>
      </g>}
      {/* Eyes — deep, serene, otherworldly, slowly observing */}
      <ellipse cx="50" cy="50" rx="5" ry="3.5" fill="#2e1065" />
      <ellipse cx="70" cy="50" rx="5" ry="3.5" fill="#2e1065" />
      <circle r="2" fill="#a855f7">
        <animate attributeName="cx" values="50.5;52.5;50.5;48.5;50.5" dur="7s" repeatCount="indefinite" />
        <animate attributeName="cy" values="49.5;50.5;49.5;49;49.5" dur="7s" repeatCount="indefinite" />
      </circle>
      <circle r="2" fill="#a855f7">
        <animate attributeName="cx" values="70.5;72.5;70.5;68.5;70.5" dur="7s" repeatCount="indefinite" />
        <animate attributeName="cy" values="49.5;50.5;49.5;49;49.5" dur="7s" repeatCount="indefinite" />
      </circle>
      <circle r="0.8" fill="#fff" opacity="0.9">
        <animate attributeName="cx" values="51;53;51;49;51" dur="7s" repeatCount="indefinite" />
        <animate attributeName="cy" values="49;50;49;48.5;49" dur="7s" repeatCount="indefinite" />
      </circle>
      <circle r="0.8" fill="#fff" opacity="0.9">
        <animate attributeName="cx" values="71;73;71;69;71" dur="7s" repeatCount="indefinite" />
        <animate attributeName="cy" values="49;50;49;48.5;49" dur="7s" repeatCount="indefinite" />
      </circle>
      {/* Subtle eye glow */}
      <circle cx="50" cy="50" r="4" fill="#a855f7" opacity="0.05" />
      <circle cx="70" cy="50" r="4" fill="#a855f7" opacity="0.05" />
      {/* Eyebrows — elegant arches */}
      <path d="M42 44 Q48 41, 55 43" stroke="#4a2880" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M65 43 Q72 41, 78 44" stroke="#4a2880" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Nose — delicate */}
      <path d="M58.5 48 L58 55 Q59 56.5, 60 57 Q61 56.5, 62 55 L61.5 48" stroke="#b09ac0" strokeWidth="0.5" fill="none" opacity="0.35" />
      {/* Mouth — knowing, mysterious smile */}
      <path d="M52 60 Q56 63, 60 62.5 Q64 62, 68 60" stroke="#7c5aa0" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {/* Ears — partially hidden by hood */}
      <ellipse cx="39" cy="52" rx="2.5" ry="4" fill="#c4a8e0" opacity="0.4" />
      <ellipse cx="81" cy="52" rx="2.5" ry="4" fill="#c4a8e0" opacity="0.4" />
      {/* Active: orbiting mystical particles */}
      {active && <>
        {/* Orbiting particle 1 */}
        <circle cx="15" cy="55" r="2.5" fill="#c084fc" opacity="0.35">
          <animateTransform attributeName="transform" type="rotate" dur="10s" from="0 60 55" to="360 60 55" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.15;0.45;0.15" dur="3s" repeatCount="indefinite" />
        </circle>
        {/* Orbiting particle 2 */}
        <circle cx="105" cy="55" r="1.8" fill="#a855f7" opacity="0.25">
          <animateTransform attributeName="transform" type="rotate" dur="14s" from="0 60 55" to="-360 60 55" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.1;0.35;0.1" dur="4s" repeatCount="indefinite" />
        </circle>
        {/* Orbiting particle 3 */}
        <circle cx="60" cy="10" r="1.2" fill="#e9d5ff" opacity="0.3">
          <animateTransform attributeName="transform" type="rotate" dur="8s" from="0 60 55" to="360 60 55" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2.5s" repeatCount="indefinite" />
        </circle>
        {/* Tiny sparkles */}
        <circle cx="28" cy="24" r="0.8" fill="#e9d5ff" opacity="0.2">
          <animate attributeName="opacity" values="0;0.4;0" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="92" cy="20" r="0.6" fill="#c084fc" opacity="0.15">
          <animate attributeName="opacity" values="0.15;0;0.15" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="20" cy="80" r="0.7" fill="#a855f7" opacity="0.2">
          <animate attributeName="opacity" values="0;0.3;0" dur="2.8s" repeatCount="indefinite" />
        </circle>
      </>}
    </svg>
  );
}

function AgentAvatar({ personality, size = 80, className = '', active = true }: AgentAvatarProps) {
  const avatars: Record<AgentPersonality, React.ReactNode> = {
    guardian: <GuardianFace size={size} active={active} />,
    analyst: <AnalystFace size={size} active={active} />,
    hunter: <HunterFace size={size} active={active} />,
    oracle: <OracleFace size={size} active={active} />,
  };

  return (
    <div className={`shrink-0 ${className}`} style={{ width: size, height: size }}>
      {avatars[personality]}
    </div>
  );
}

export { AgentAvatar };
export type { AgentAvatarProps };
