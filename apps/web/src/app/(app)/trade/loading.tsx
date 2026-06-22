// Fallback for the layout's content slot while `/trade/[address]` awaits BirdEye. The persistent
// chrome (banners, top bar, sidebar) stays mounted in `layout.tsx`, so only this region spins —
// switching tokens no longer reloads the whole app.
export default function TradeLoading() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center lg:h-full">
      <div
        aria-label="Loading market data"
        className="size-8 animate-spin rounded-full border-2 border-white/15 border-t-[#16e27b]"
        role="status"
      />
    </div>
  );
}
