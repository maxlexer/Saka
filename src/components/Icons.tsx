import type { ComponentType, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const make = (d: string) =>
  function Icon(props: IconProps) {
    return (
      <svg
        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}
      >
        <path d={d} />
      </svg>
    );
  };

export const MenuIcon = make("M3 7h18M3 12h18M3 17h18");
export const CloseIcon = make("M5 5l14 14M19 5L5 19");
export const PlusIcon = make("M12 5v14M5 12h14");
export const MinusIcon = make("M5 12h14");
export const CheckIcon = make("M5 12.5l4.5 4.5L19 7.5");
export const ArrowIcon = make("M4 12h16M14 6l6 6-6 6");
export const CartIcon = make("M5 8h14l-1 12H6L5 8zM9 8V6.5a3 3 0 016 0V8");
export const AlertIcon = make("M12 3a9 9 0 100 18 9 9 0 000-18zM9 9l6 6M15 9l-6 6");
export const InstagramIcon = make("M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM12 8a4 4 0 100 8 4 4 0 000-8zM17.5 6.5v.01");
export const FacebookIcon = make("M14 21v-8h3l.5-3.5H14V7.5c0-1 .5-1.5 1.5-1.5H17.5V3h-2.7C12.3 3 10.5 4.5 10.5 7v2.5H8V13h2.5v8");
export const TelegramIcon = make("M21 4L3 11l6 2 2 6 3-3.5 5 3.5L21 4zM9 13l12-9");

const SOCIAL: Record<string, ComponentType<IconProps>> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  telegram: TelegramIcon,
};

export const socialIcon = (label: string) => SOCIAL[label.trim().toLowerCase()];
