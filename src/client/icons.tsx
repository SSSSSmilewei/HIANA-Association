/** 线条图标，24×24，跟随文字颜色。 */

const PATHS: Record<string, React.ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  book: <path d="M4 6.5c2.8-1 5.5-1 8 .8 2.5-1.8 5.2-1.8 8-.8v11c-2.8-1-5.5-1-8 .8-2.5-1.8-5.2-1.8-8-.8zM12 7.3v11" />,
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="12.8" r="3.4" />
    </>
  ),
  megaphone: <path d="M4 10v4h3l8 4.5v-13L7 10zM18 9.2a3.6 3.6 0 0 1 0 5.6" />,
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5c1.3-3 3.9-4.5 7-4.5s5.7 1.5 7 4.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 18.5c.9-2.6 3-4 5.5-4s4.6 1.4 5.5 4M15.5 6.2a3 3 0 0 1 0 5.6M17.5 14.8c1.4.6 2.4 1.8 3 3.7" />
    </>
  ),
  clipboard: <path d="M8 4h8v3H8zM6 5.5H5v14.5h14V5.5h-1M9 11.5h6M9 15.5h4" />,
  edit: <path d="M5 19h4L19 9l-4-4L5 15zM13.5 6.5l4 4" />,
  sliders: (
    <>
      <path d="M5 7h9M18 7h1M5 17h3M12 17h7" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </>
  ),
  bell: <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 20.5a2.2 2.2 0 0 0 4 0" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  external: <path d="M8 16 16 8M10 8h6v6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  play: <path d="M8 6.5v11l9-5.5z" fill="currentColor" stroke="none" />,
  terminal: <path d="M5 8l4 4-4 4M11.5 16.5H19" />,
  code: <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />,
  pencil: <path d="M4 20h4L18.5 9.5l-4-4L4 16zM12.5 7.5l4 4" />,
  flag: <path d="M6 21V4M6 4h11l-2 4 2 4H6" />,
  star: <path d="M12 3.5 14.4 9l5.6.5-4.3 3.7 1.3 5.6L12 15.9l-5 2.9 1.3-5.6L4 9.5 9.6 9z" />,
  video: (
    <>
      <rect x="3.5" y="5.5" width="17" height="12" rx="2.5" />
      <path d="M10.5 9.2v5l4-2.5z" fill="currentColor" stroke="none" />
    </>
  ),
  pin: <path d="M9 4h6l-1 5 3 3H7l3-3zM12 12v8" />,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 19h14" />,
  flip: <path d="M4 9a8 8 0 0 1 14.5-3M20 15a8 8 0 0 1-14.5 3M18.5 2.5V6H15M5.5 21.5V18H9" />,
  refresh: <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18.5 3v4h-4M5.5 21v-4h4" />,
  logout: <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />,
  key: (
    <>
      <circle cx="8.5" cy="12" r="4" />
      <path d="M12.5 12H20M17 12v3M20 12v2.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m4 17 5-5 4 4 2.5-2.5L20 18" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, stroke = 1.8, className, style }: { name: IconName; size?: number; stroke?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {PATHS[name]}
    </svg>
  );
}

export const KIND_ICON: Record<string, IconName> = {
  lecture: "play",
  pset: "pencil",
  practice: "terminal",
  reading: "book",
  project: "flag",
};
