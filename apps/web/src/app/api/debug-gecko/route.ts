// TEMPORARY diagnostic — capture exactly what GeckoTerminal returns to Railway's datacenter IP.
// Remove after reading. No secrets involved (GeckoTerminal is keyless).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_WITH_VERSION =
  "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools";

async function probe(headers: Record<string, string>) {
  try {
    const res = await fetch(URL_WITH_VERSION, { headers });
    const body = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get("content-type"),
      server: res.headers.get("server"),
      cfRay: res.headers.get("cf-ray"),
      bodySnippet: body.slice(0, 300),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function GET() {
  const [withVersion, plain] = await Promise.all([
    probe({ accept: "application/json;version=20230302" }),
    probe({ accept: "application/json" }),
  ]);
  return Response.json({ withVersion, plain });
}
