// App Store + Google Play badge links. Server Component (plain links).
const APP_STORE_URL = "https://apps.apple.com/us/app/chadwallet/id6757367474";
const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=xyz.chadwallet.www";

const BADGE_CLASS =
  "flex items-center gap-2.5 rounded-xl bg-foreground px-4 py-2.5 text-background transition-transform hover:scale-[1.03]";

function AppleGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M4 3l14 9-14 9V3z" />
    </svg>
  );
}

export function StoreBadges() {
  return (
    <div className="flex flex-wrap gap-3">
      <a
        className={BADGE_CLASS}
        href={APP_STORE_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        <AppleGlyph />
        <span className="text-left leading-tight">
          <span className="block text-[10px] opacity-70">Download on the</span>
          <span className="block font-semibold text-sm">App Store</span>
        </span>
      </a>
      <a
        className={BADGE_CLASS}
        href={GOOGLE_PLAY_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        <PlayGlyph />
        <span className="text-left leading-tight">
          <span className="block text-[10px] opacity-70">GET IT ON</span>
          <span className="block font-semibold text-sm">Google Play</span>
        </span>
      </a>
    </div>
  );
}
