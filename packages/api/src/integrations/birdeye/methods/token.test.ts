import { expect, it } from "vitest";
// fixture: REAL — captured from the live BirdEye API (/defi/token_overview).
import overview from "../__fixtures__/overview.json";
import { jsonResponse, makeClient } from "../test-helpers";

it("normalizes a token_overview payload to TokenDetail", async () => {
  const { client } = makeClient(() => Promise.resolve(jsonResponse(overview)));

  const result = await client.token({
    address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  });

  expect(result).toEqual({
    address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    symbol: "Bonk",
    name: "Bonk",
    logoUri: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
    priceUsd: 0.000_004_622_034_887_524_746,
    change24h: 0.532_308_482_004_104_5,
    volume24h: 673_226.278_850_198_6,
    marketCap: 385_760_753.487_520_34,
    liquidity: 2_784_490.269_094_329,
    holders: 999_275,
    totalSupply: 87_994_718_320_878.69,
    description: "The Official Bonk Inu token",
    links: {
      website: "https://www.bonkcoin.com/",
      twitter: "https://twitter.com/bonk_inu",
    },
  });
});

it("returns null when the mint is unknown (null data)", async () => {
  const { client } = makeClient(() =>
    Promise.resolve(jsonResponse({ success: true, data: null }))
  );

  await expect(client.token({ address: "UnknownMint" })).resolves.toBeNull();
});
