// Placeholder trading route — the full 3-column trading UI lands in a later M5 ticket.
// Exists now so the landing's banner pills link to a real, typed route.
export default async function TradePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return (
    <main className="dark min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="font-bold text-2xl">Trading</h1>
        <p className="mt-2 break-all text-muted-foreground">{address}</p>
        <p className="mt-8 text-muted-foreground text-sm">
          Trading UI coming soon.
        </p>
      </div>
    </main>
  );
}
