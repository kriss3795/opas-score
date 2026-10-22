type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const IconBall = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7l3.5 2.5-1.3 4h-4.4l-1.3-4z" fill="currentColor" stroke="none" />
    <path d="M12 7V3.5M15.5 9.5l3.5-1.2M14.2 13.5l2.2 3.3M9.8 13.5l-2.2 3.3M8.5 9.5L5 8.3" />
  </svg>
);

export const IconF1 = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4 20V4" />
    <path d="M4 4h14l-3 4 3 4H4" />
    <path d="M8 4v8M12 4v8M4 8h14" strokeWidth={1.2} />
  </svg>
);

export const IconCalendar = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const IconTable = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M5 20V10M12 20V4M19 20v-7" strokeWidth={2.6} />
  </svg>
);

export const IconSettings = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);

export const IconBell = ({ className, on }: P & { on?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} fill={on ? "currentColor" : "none"}>
    <path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15z" />
    <path d="M10 20.5a2 2 0 004 0" fill="none" />
  </svg>
);

export const IconSearch = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </svg>
);

export const IconCheck = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={3}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const IconTv = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M9 21h6M8 2l4 4 4-4" />
  </svg>
);

export const IconBack = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const IconShare = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" />
  </svg>
);

export const IconSofa = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4 11V8a3 3 0 013-3h10a3 3 0 013 3v3" />
    <path d="M2 13a2 2 0 014 0v2h12v-2a2 2 0 014 0v5H2zM5 18v2M19 18v2" />
  </svg>
);

export function SportIcon({ sport, className }: { sport: string; className?: string }) {
  return sport === "f1" ? <IconF1 className={className} /> : <IconBall className={className} />;
}
