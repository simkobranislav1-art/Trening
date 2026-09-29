import type { ReactNode } from 'react';

const Svg = ({ children, size = 26, sw = 1.8 }: { children: ReactNode; size?: number; sw?: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {children}
  </svg>
);

export const HomeIcon = () => (
  <Svg>
    <path d="M3.5 11L12 3.5 20.5 11" />
    <path d="M5.5 9.5V20h4.5v-5.5h4V20h4.5V9.5" />
  </Svg>
);
export const DumbbellIcon = () => (
  <Svg>
    <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  </Svg>
);
export const ClockIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const ListIcon = () => (
  <Svg>
    <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </Svg>
);
export const GearIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </Svg>
);
export const PhoneIcon = () => (
  <Svg>
    <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
    <path d="M11 18.5h2" />
  </Svg>
);
export const PlusIcon = ({ size = 22 }: { size?: number }) => (
  <Svg size={size} sw={2}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const CheckIcon = ({ size = 22, sw = 2.2 }: { size?: number; sw?: number }) => (
  <Svg size={size} sw={sw}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const ChevronLeftIcon = () => (
  <Svg size={24} sw={2.2}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);
export const ChevronDownIcon = () => (
  <Svg size={24} sw={2.2}>
    <path d="M5 9l7 7 7-7" />
  </Svg>
);
export const MoreVerticalIcon = () => (
  <Svg size={24} sw={2.6}>
    <path d="M12 5.5h.01M12 12h.01M12 18.5h.01" />
  </Svg>
);
export const MoreIcon = () => (
  <Svg size={24} sw={2.6}>
    <path d="M5.5 12h.01M12 12h.01M18.5 12h.01" />
  </Svg>
);
export const TimerIcon = ({ size = 22 }: { size?: number }) => (
  <Svg size={size} sw={1.9}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 9.5v4l2.5 1.5M9.5 3h5" />
  </Svg>
);
export const PauseIcon = () => (
  <Svg size={22} sw={2.2}>
    <path d="M9 6v12M15 6v12" />
  </Svg>
);
export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
    <path d="M8 5.5v13a1 1 0 001.5.86l10.4-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" />
  </svg>
);
export const ClipboardIcon = () => (
  <Svg size={22}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4V3h6v1M9 10h6M9 14h6" />
  </Svg>
);
export const SearchIcon = () => (
  <Svg size={22}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </Svg>
);
export const PencilIcon = () => (
  <Svg size={20}>
    <path d="M4 20l1-4L16.5 4.5a2 2 0 013 3L8 19l-4 1z" />
  </Svg>
);
