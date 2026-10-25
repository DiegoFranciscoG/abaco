import { digitsOf, RODS, rodFromDigit } from './three/soroban';

/** Static soroban drawn in SVG: poster for the 3D scene and the reduced-motion version. Same numbers, same colors. */
export function AbacusArt({ value = 2026, className = '' }: { value?: number; className?: string }) {
  const digits = digitsOf(value);
  const W = 520;
  const H = 380;
  const left = 70;
  const spacing = 95;
  const beamY = 128;
  const bead = (cx: number, cy: number, heaven: boolean, key: string, order: number) => {
    const style = { animationDelay: `${120 + order * 28}ms`, '--from': heaven ? '-34px' : '34px' } as React.CSSProperties;
    return (
      <g key={key} transform={`translate(${cx} ${cy})`}>
        <g className="bead-in" style={style}>
          <ellipse rx="40" ry="17" fill={heaven ? 'url(#beadRed)' : 'url(#beadCream)'} />
          <ellipse rx="28" ry="5" cy="-6" fill="#fff" opacity={heaven ? 0.18 : 0.45} />
        </g>
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`Ábaco que marca ${value}`}>
      <defs>
        <linearGradient id="wood" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7a4428" />
          <stop offset="1" stopColor="#4a2614" />
        </linearGradient>
        <radialGradient id="beadRed" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#e2475e" />
          <stop offset="0.6" stopColor="#b3122e" />
          <stop offset="1" stopColor="#7b0b1f" />
        </radialGradient>
        <radialGradient id="beadCream" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fffaf2" />
          <stop offset="0.65" stopColor="#efe2cd" />
          <stop offset="1" stopColor="#c9b28f" />
        </radialGradient>
        <radialGradient id="floor" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#2a1408" stopOpacity="0.32" />
          <stop offset="1" stopColor="#2a1408" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={W / 2} cy={H - 22} rx="230" ry="20" fill="url(#floor)" />
      <rect x="20" y="20" width={W - 40} height="26" rx="10" fill="url(#wood)" />
      <rect x="20" y={H - 72} width={W - 40} height="26" rx="10" fill="url(#wood)" />
      <rect x="20" y="20" width="24" height={H - 66} rx="10" fill="url(#wood)" />
      <rect x={W - 44} y="20" width="24" height={H - 66} rx="10" fill="url(#wood)" />
      {Array.from({ length: RODS }, (_, r) => (
        <rect key={`rod-${r}`} x={left + 20 + r * spacing - 2} y="46" width="4" height={H - 118} fill="#cdb27a" />
      ))}
      <rect x="44" y={beamY - 8} width={W - 88} height="16" rx="4" fill="url(#wood)" />
      {digits.map((digit, r) => {
        const state = rodFromDigit(digit);
        const cx = left + 20 + r * spacing;
        const items = [bead(cx, state.heaven ? beamY - 26 : 66, true, `h-${r}`, r * 5)];
        for (let j = 0; j < 4; j += 1) {
          const active = j < state.earth;
          const y = active ? beamY + 26 + j * 34 : H - 90 - (3 - j) * 34;
          items.push(bead(cx, y, false, `e-${r}-${j}`, r * 5 + j + 1));
        }
        return <g key={`r-${r}`}>{items}</g>;
      })}
    </svg>
  );
}

/** Clay-style "question card" illustration, in the spirit of the reference design. */
export function QuestionArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 360" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="qcard1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f7c3cb" />
          <stop offset="1" stopColor="#f2aeb9" />
        </linearGradient>
        <linearGradient id="qcard2" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ec8695" />
          <stop offset="1" stopColor="#e06b7e" />
        </linearGradient>
        <radialGradient id="qball" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ef3b55" />
          <stop offset="1" stopColor="#a50d26" />
        </radialGradient>
        <filter id="qsoft" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#8a1d2e" floodOpacity="0.22" />
        </filter>
      </defs>
      <circle cx="40" cy="70" r="6" fill="#e9a3ae" />
      <circle cx="345" cy="320" r="7" fill="#e9a3ae" />
      <rect x="70" y="70" width="230" height="130" rx="22" fill="url(#qcard1)" filter="url(#qsoft)" />
      <rect x="100" y="110" width="210" height="90" rx="20" fill="url(#qcard2)" />
      <g filter="url(#qsoft)">
        <rect x="55" y="160" width="230" height="150" rx="22" fill="#fff" />
        <rect x="80" y="190" width="150" height="12" rx="6" fill="#f3d4d9" />
        <rect x="80" y="215" width="115" height="12" rx="6" fill="#f3d4d9" />
        <rect x="80" y="240" width="135" height="12" rx="6" fill="#f3d4d9" />
      </g>
      <g filter="url(#qsoft)">
        <circle cx="300" cy="160" r="54" fill="url(#qball)" />
        <text x="300" y="183" textAnchor="middle" fontSize="70" fontWeight="800" fill="#fff" fontFamily="Inter Variable, sans-serif">
          ?
        </text>
      </g>
    </svg>
  );
}

/** Brand mark: three beads on a rod. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="9" fill="var(--red)" />
      <rect x="15.2" y="6" width="1.6" height="20" rx="0.8" fill="#fbe8ea" />
      <ellipse cx="16" cy="10.5" rx="6.2" ry="2.6" fill="#fff" />
      <ellipse cx="16" cy="17.5" rx="6.2" ry="2.6" fill="#fbd3d9" />
      <ellipse cx="16" cy="22.5" rx="6.2" ry="2.6" fill="#fbd3d9" />
      <rect x="7" y="13.4" width="18" height="1.6" rx="0.8" fill="#fbe8ea" />
    </svg>
  );
}
