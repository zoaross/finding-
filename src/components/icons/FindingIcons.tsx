/**
 * Finding — Custom line icon system.
 * Thin-stroke, futuristic, purple-accent line icons matching the brand reference.
 * All icons accept standard SVG props; default size 24, currentColor stroke.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number, props: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

/** Brand mark — orbital ring with offset node + accent dot */
export function FindingMark({ size = 32, ...props }: IconProps) {
  return (
    <svg {...base(size, props)} viewBox="0 0 32 32" strokeWidth={1.5}>
      <circle cx="16" cy="16" r="12" stroke="currentColor" opacity="0.55" />
      <circle cx="16" cy="16" r="12" stroke="oklch(0.72 0.18 295)" strokeDasharray="4 80" strokeDashoffset="-30" />
      <line x1="9" y1="16" x2="20" y2="16" stroke="currentColor" opacity="0.7" />
      <circle cx="9" cy="16" r="1.6" fill="currentColor" />
      <circle cx="20" cy="16" r="3.4" fill="oklch(0.72 0.18 295)" />
    </svg>
  );
}

/** AI / Target — crosshair with center node */
export function IconTarget({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="12" cy="12" r="7" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <circle cx="12" cy="12" r="1.8" fill="oklch(0.72 0.18 295)" stroke="none" />
    </svg>
  );
}

/** Globe — meridians */
export function IconGlobe({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  );
}

/** Infinity */
export function IconInfinity({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M6.5 12c0-2.2 1.8-4 4-4 1.5 0 2.5.9 3.5 2.2L17 14c1 1.3 2 2.2 3.5 2.2 2.2 0 4-1.8 4-4s-1.8-4-4-4c-1.5 0-2.5.9-3.5 2.2L14 11.8C13 10.5 12 9.6 10.5 9.6c-2.2 0-4 1.8-4 4z" transform="translate(-1.25 -.1)" />
    </svg>
  );
}

/** Shield with check */
export function IconShield({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3z" />
      <path d="M9 12l2.2 2.2L15 10.5" stroke="oklch(0.72 0.18 295)" />
    </svg>
  );
}

/** Pencil / Edit (Step 1) */
export function IconPencil({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M14.5 4.5l5 5L8 21H3v-5L14.5 4.5z" />
      <path d="M13 6l5 5" />
    </svg>
  );
}

/** Chat bubbles (Step 3) */
export function IconChat({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M4 6a2 2 0 012-2h9a2 2 0 012 2v6a2 2 0 01-2 2H9l-3 3v-3a2 2 0 01-2-2V6z" />
      <circle cx="8.5" cy="9" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="11" cy="9" r="0.8" fill="oklch(0.72 0.18 295)" stroke="none" />
      <circle cx="13.5" cy="9" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** User */
export function IconUser({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

/** Bell */
export function IconBell({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M6 16V11a6 6 0 1112 0v5l1.5 2H4.5L6 16z" />
      <path d="M10 21a2 2 0 004 0" />
    </svg>
  );
}

/** Search */
export function IconSearch({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.2" y1="16.2" x2="21" y2="21" />
    </svg>
  );
}

/** Settings hex with center dot */
export function IconSettings({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M12 2l8.5 5v10L12 22l-8.5-5V7L12 2z" />
      <circle cx="12" cy="12" r="2.6" stroke="oklch(0.72 0.18 295)" />
    </svg>
  );
}

/** Logout arrow */
export function IconLogout({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M14 4h5a1 1 0 011 1v14a1 1 0 01-1 1h-5" />
      <path d="M10 8l4 4-4 4" />
      <line x1="14" y1="12" x2="3" y2="12" />
    </svg>
  );
}

/** Social: X / Twitter */
export function IconX({ size = 18, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M4 4l16 16M20 4L4 20" />
    </svg>
  );
}

export function IconGithub({ size = 18, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M12 3a9 9 0 00-2.85 17.54c.45.08.62-.2.62-.43v-1.5c-2.5.55-3.03-1.2-3.03-1.2-.41-1.05-1-1.33-1-1.33-.83-.57.06-.56.06-.56.92.06 1.4.95 1.4.95.82 1.4 2.15 1 2.67.76.08-.6.32-1 .58-1.23-2-.23-4.1-1-4.1-4.45 0-.98.35-1.78.92-2.4-.09-.23-.4-1.15.09-2.4 0 0 .76-.24 2.5.92a8.7 8.7 0 014.55 0c1.74-1.16 2.5-.92 2.5-.92.5 1.25.18 2.17.09 2.4.57.62.92 1.42.92 2.4 0 3.46-2.1 4.22-4.1 4.44.32.28.62.83.62 1.67v2.48c0 .23.16.51.62.42A9 9 0 0012 3z" />
    </svg>
  );
}

export function IconLinkedin({ size = 18, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="8" y1="10" x2="8" y2="17" />
      <circle cx="8" cy="7" r="0.8" fill="currentColor" stroke="none" />
      <path d="M12 17v-4a2.5 2.5 0 015 0v4M12 10v7" />
    </svg>
  );
}

export function IconDiscord({ size = 18, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M7 8c1.5-.7 3-1 5-1s3.5.3 5 1l1 2c1 2 1.5 4.5 1.5 7l-2.5 1.5L16 16c-1.2.5-2.6.8-4 .8s-2.8-.3-4-.8l-1 2.5L4.5 17c0-2.5.5-5 1.5-7l1-2z" />
      <circle cx="9.5" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
