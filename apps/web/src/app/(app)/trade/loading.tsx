// Shown while the server resolves the trade route: the `/trade` redirect's trending lookup and the
// `/trade/[address]` market panels each await BirdEye, which can take a couple seconds.
export default function TradeLoading() {
  return (
    <main className="dark flex min-h-svh items-center justify-center bg-[#0b0f10]">
      <div
        aria-label="Loading market data"
        className="size-8 animate-spin rounded-full border-2 border-white/15 border-t-[#16e27b]"
        role="status"
      />
    </main>
  );
}
