import React from 'react';

export interface WeaveLogoProps {
  size?: number;
  className?: string;
  glow?: boolean;
  animated?: boolean;
  showText?: boolean;
  textClassName?: string;
}

/**
 * Weave Brand Logo featuring the "Interwoven Loop W"
 * Two glowing overlapping thread paths in Amber (#FF9D00) and Cyan (#00E5FF).
 */
export const WeaveLogo: React.FC<WeaveLogoProps> = ({
  size = 28,
  className = '',
  glow = true,
  animated = false,
  showText = false,
  textClassName = 'text-white font-bold text-sm tracking-wide',
}) => {
  const gradientIdAmber = `weave-amber-${size}`;
  const gradientIdCyan = `weave-cyan-${size}`;
  const filterIdGlow = `weave-glow-${size}`;

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`} data-testid="weave-brand-logo">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${animated ? 'transition-transform duration-300 hover:scale-105' : ''}`}
        aria-label="Weave Studio Logo"
      >
        <defs>
          {/* Amber Thread Gradient */}
          <linearGradient id={gradientIdAmber} x1="10" y1="20" x2="60" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFC107" />
            <stop offset="50%" stopColor="#FF9D00" />
            <stop offset="100%" stopColor="#FF6D00" />
          </linearGradient>

          {/* Cyan Thread Gradient */}
          <linearGradient id={gradientIdCyan} x1="90" y1="20" x2="40" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="50%" stopColor="#00B0FF" />
            <stop offset="100%" stopColor="#0091EA" />
          </linearGradient>

          {/* Glow Filter */}
          {glow && (
            <filter id={filterIdGlow} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* Ambient background glow ring */}
        <circle cx="50" cy="50" r="44" fill="rgba(14, 16, 23, 0.4)" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1.5" />

        {/* Outer subtle orbital guide */}
        <path
          d="M 22 28 C 30 18, 70 18, 78 28 C 88 40, 88 65, 76 78 C 65 90, 35 90, 24 78 C 12 65, 12 40, 22 28 Z"
          stroke="rgba(255, 255, 255, 0.04)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Background glow layers when active */}
        {glow && (
          <g opacity="0.35" filter={`url(#${filterIdGlow})`}>
            {/* Amber Glow Path */}
            <path
              d="M 20 25 C 22 55, 34 82, 42 82 C 50 82, 54 52, 58 40 C 62 28, 70 28, 74 40 C 78 52, 82 82, 90 82"
              stroke="#FF9D00"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Cyan Glow Path */}
            <path
              d="M 80 25 C 78 55, 66 82, 58 82 C 50 82, 46 52, 42 40 C 38 28, 30 28, 26 40 C 22 52, 18 82, 10 82"
              stroke="#00E5FF"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* Cyan Loop (Under / Left-Over cross) */}
        <path
          d="M 80 25 C 76 52, 65 80, 56 80 C 48 80, 44 55, 40 42 C 36 29, 28 29, 24 42 C 20 55, 16 78, 12 78"
          stroke={`url(#${gradientIdCyan})`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animated ? 'animate-pulse' : ''}
        />

        {/* Amber Loop (Over / Right-Over cross forming the Interwoven W) */}
        <path
          d="M 20 25 C 24 52, 35 80, 44 80 C 52 80, 56 55, 60 42 C 64 29, 72 29, 76 42 C 80 55, 84 78, 88 78"
          stroke={`url(#${gradientIdAmber})`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interweaving intersection nodes */}
        <circle cx="44" cy="48" r="3.5" fill="#00E5FF" opacity="0.9" filter={`url(#${filterIdGlow})`} />
        <circle cx="56" cy="48" r="3.5" fill="#FF9D00" opacity="0.9" filter={`url(#${filterIdGlow})`} />
        <circle cx="50" cy="80" r="4" fill="#FFFFFF" opacity="0.95" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={textClassName}>Weave</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              STUDIO
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeaveLogo;
