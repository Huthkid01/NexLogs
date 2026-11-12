import { Link } from 'react-router-dom';

const HERO_MOBILE = '/images/hero/nexlogs-hero-mobile.jpg';
const HERO_DESKTOP = '/images/hero/nexlogs-hero-desktop.jpg';

/**
 * Guest homepage hero — art-directed images (mobile + desktop) so the banner
 * shows fully like Socialab-style sliders, instead of a fixed crop that clips text.
 */
export function GuestHeroBanner() {
  return (
    <Link
      to="/register"
      aria-label="Get started on Nexlogs — shop SMS numbers, RDP, and social accounts"
      className="block overflow-hidden rounded-none bg-[#f26522] lg:rounded-2xl"
    >
      <picture>
        <source media="(min-width: 768px)" srcSet={HERO_DESKTOP} />
        <img
          src={HERO_MOBILE}
          alt="Nexlogs marketplace — SMS numbers, RDP plans, and social accounts. Shop now."
          width={1280}
          height={960}
          className="h-auto w-full object-cover object-center"
          decoding="async"
          fetchPriority="high"
          loading="eager"
          draggable={false}
        />
      </picture>
    </Link>
  );
}
