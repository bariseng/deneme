import { NextRequest, NextResponse } from "next/server";
import { getLatestPrices, getPriceIndex, getIndexStats, seedPriceIndex } from "@/lib/price-indexer";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { tuikProvider } from "@/lib/providers/tuik-provider";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const sector = searchParams.get("sector") || undefined;
    const item = searchParams.get("item") || undefined;
    const city = searchParams.get("city") || undefined;

    if (action === "seed") {
      await seedPriceIndex();
      return NextResponse.json({ success: true });
    }

    // When real price index is enabled, sync TÜİK macro indices
    if (isFeatureEnabled("USE_REAL_PRICE_INDEX") && action === "sync") {
      const count = await tuikProvider.syncMacroIndices();
      return NextResponse.json({ success: true, synced: count });
    }

    if (action === "stats") {
      const stats = await getIndexStats();

      // Enrich with TÜİK macro data when enabled
      if (isFeatureEnabled("USE_REAL_PRICE_INDEX")) {
        try {
          const [construction, ppi, cpi] = await Promise.all([
            tuikProvider.fetchConstructionCostIndex(),
            tuikProvider.fetchPPIIndex(),
            tuikProvider.fetchCPIIndex(),
          ]);
          return NextResponse.json({
            ...stats,
            macro: {
              constructionCost: construction.slice(0, 12),
              ppi: ppi.slice(0, 12),
              cpi: cpi.slice(0, 12),
            },
          });
        } catch {
          // Fallback to stats only
        }
      }

      return NextResponse.json(stats);
    }

    if (item || city) {
      const data = await getPriceIndex({ sector, item, city });
      return NextResponse.json(data);
    }

    const data = await getLatestPrices(sector);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
