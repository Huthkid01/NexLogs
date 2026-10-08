import { Link } from 'react-router-dom';

/** Guest-only homepage ad — HTML/CSS so it never depends on a broken image. */
export function GuestHeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-none bg-[#f26522] lg:rounded-2xl">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#ff7a3d]/35" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-[#e25515]/45" />

      <Link
        to="/register"
        aria-label="Get started on Nexlogs"
        className="relative flex h-40 w-full flex-col items-center justify-center px-4 text-center md:h-64"
      >
        <p className="text-base font-black tracking-wide text-[#f6c343] sm:text-2xl md:text-3xl">
          GET EVERYTHING ON NEXLOGS
        </p>
        <p className="mt-2 text-xs font-bold uppercase leading-snug text-white sm:mt-3 sm:text-base md:text-lg">
          Social logs · RDP plans · SMS verification
        </p>
        <p className="mt-1 max-w-xl text-[11px] font-semibold uppercase leading-snug text-white/95 sm:mt-2 sm:text-sm">
          Numbers for all app verification · wallet checkout · fast delivery
        </p>
        <span className="mt-3 text-sm font-black italic text-gray-900 sm:mt-4 sm:text-xl md:text-2xl">
          CLICK HERE
        </span>
      </Link>
    </div>
  );
}
