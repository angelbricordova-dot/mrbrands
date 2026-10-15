// One authored icon set: 24px grid, 1.75 stroke, round caps. Used only in the owner's panel.
import type { SVGProps } from "react";

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      {children}
    </svg>
  );
}

export const IconHome = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
  </Icon>
);
export const IconTicket = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4z" />
    <path d="M14.5 6v12" strokeDasharray="1.5 2.5" />
  </Icon>
);
export const IconShirt = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M8.5 4 4 6.5l1.8 4L8 9.6V20h8V9.6l2.2.9 1.8-4L15.5 4a3.5 3.5 0 0 1-7 0z" />
  </Icon>
);
export const IconSliders = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M5 6h9M18 6h1M5 12h3M12 12h7M5 18h11M20 18h-1" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Icon>
);
export const IconStore = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5V20h16V9.5M4 9.5c0 1.4 1.1 2.5 2.7 2.5S9.3 10.9 9.3 9.5c0 1.4 1.2 2.5 2.7 2.5s2.7-1.1 2.7-2.5c0 1.4 1.1 2.5 2.6 2.5S20 10.9 20 9.5M9.5 20v-5h5v5" />
  </Icon>
);
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const IconChat = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M5 18.5 4 21l3.2-1.1A8.5 8.5 0 1 0 5 18.5z" />
  </Icon>
);
export const IconArrowRight = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);
export const IconArrowLeft = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);
export const IconTrash = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />
  </Icon>
);
export const IconRefresh = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M19 8a7.5 7.5 0 1 0 .9 6M19 4v4h-4" />
  </Icon>
);
export const IconLogout = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />
  </Icon>
);
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
