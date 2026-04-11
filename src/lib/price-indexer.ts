import { prisma } from "@/lib/prisma";

// ─── TYPES ──────────────────────────────────────────────────

interface PricePoint {
  month: string;
  avg: number;
  min: number;
  max: number;
  sampleCount: number;
}

interface RegionalPoint {
  city: string;
  avg: number;
  min: number;
  max: number;
  sampleCount: number;
}

// ─── VERİ TOPLAMA PİPELİNE ─────────────────────────────────

export async function extractPricesFromResult(tenderResult: {
  tenderId: string;
  winningAmount: number;
  tender?: {
    tenderType: string;
    city: string;
    estimatedCost?: number | null;
  };
}) {
  // Gerçek uygulamada ihale sonuç verilerinden birim fiyatlar çıkarılır
  // Şimdilik yapı hazır bırakılıyor
  return {
    tenderId: tenderResult.tenderId,
    amount: tenderResult.winningAmount,
    city: tenderResult.tender?.city,
    sector: tenderResult.tender?.tenderType,
  };
}

export async function updateMonthlyIndex() {
  // Cron job ile aylık çalışacak
  // Mevcut seed data üzerinden çalışır
  const indices = await prisma.unitPriceIndex.findMany({
    orderBy: { month: "desc" },
    take: 100,
  });

  // Trend oluştur
  const grouped: Record<string, typeof indices> = {};
  for (const idx of indices) {
    const key = `${idx.sector}|${idx.item}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(idx);
  }

  for (const [key, items] of Object.entries(grouped)) {
    const [sector, item] = key.split("|");
    const prices: PricePoint[] = items
      .sort((a, b) => a.month.getTime() - b.month.getTime())
      .map((i) => ({
        month: i.month.toISOString().slice(0, 7),
        avg: Number(i.avgPrice),
        min: Number(i.minPrice),
        max: Number(i.maxPrice),
        sampleCount: i.sampleCount,
      }));

    await prisma.unitPriceTrend.upsert({
      where: { sector_item_period: { sector, item, period: "MONTHLY" } },
      create: {
        sector,
        item,
        itemLabel: items[0].itemLabel,
        prices: JSON.parse(JSON.stringify(prices)),
        period: "MONTHLY",
      },
      update: {
        prices: JSON.parse(JSON.stringify(prices)),
        itemLabel: items[0].itemLabel,
      },
    });
  }

  // Bölgesel karşılaştırma oluştur
  const latestMonth = indices[0]?.month;
  if (latestMonth) {
    const latestData = await prisma.unitPriceIndex.findMany({
      where: { month: latestMonth, city: { not: null } },
    });

    const itemGroups: Record<string, typeof latestData> = {};
    for (const d of latestData) {
      if (!itemGroups[d.item]) itemGroups[d.item] = [];
      itemGroups[d.item].push(d);
    }

    for (const [item, data] of Object.entries(itemGroups)) {
      const comparisons: RegionalPoint[] = data.map((d) => ({
        city: d.city!,
        avg: Number(d.avgPrice),
        min: Number(d.minPrice),
        max: Number(d.maxPrice),
        sampleCount: d.sampleCount,
      }));

      await prisma.regionalPriceComparison.upsert({
        where: { item },
        create: {
          item,
          itemLabel: data[0].itemLabel,
          sector: data[0].sector,
          unit: data[0].unit,
          comparisons: JSON.parse(JSON.stringify(comparisons)),
        },
        update: {
          comparisons: JSON.parse(JSON.stringify(comparisons)),
        },
      });
    }
  }

  return { updated: Object.keys(grouped).length };
}

export async function calculateTrend(sector: string, item: string, months: number = 12) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const data = await prisma.unitPriceIndex.findMany({
    where: {
      sector,
      item,
      month: { gte: since },
    },
    orderBy: { month: "asc" },
  });

  return data.map((d) => ({
    month: d.month.toISOString().slice(0, 7),
    avg: Number(d.avgPrice),
    min: Number(d.minPrice),
    max: Number(d.maxPrice),
    sampleCount: d.sampleCount,
    city: d.city,
  }));
}

// ─── SORGULAMA ──────────────────────────────────────────────

export async function searchPriceItems(query: string, sector?: string) {
  const where: Record<string, unknown> = {};
  if (sector) where.sector = sector;
  if (query) {
    where.itemLabel = { contains: query, mode: "insensitive" };
  }

  // En son ay bilgisini bul
  const latest = await prisma.unitPriceIndex.findFirst({
    where: { ...where, city: null },
    orderBy: { month: "desc" },
    select: { month: true },
  });

  if (!latest) {
    return prisma.unitPriceIndex.findMany({
      where,
      select: { item: true, itemLabel: true, sector: true, unit: true },
      distinct: ["item"],
      take: 20,
    });
  }

  // En güncel fiyat bilgisiyle birlikte döndür
  const results = await prisma.unitPriceIndex.findMany({
    where: { ...where, month: latest.month, city: null },
    select: {
      item: true,
      itemLabel: true,
      sector: true,
      unit: true,
      avgPrice: true,
      minPrice: true,
      maxPrice: true,
    },
    distinct: ["item"],
    take: 20,
    orderBy: { itemLabel: "asc" },
  });

  return results;
}

export async function getPriceIndex(filters: {
  sector?: string;
  item?: string;
  city?: string;
  months?: number;
}) {
  const since = new Date();
  since.setMonth(since.getMonth() - (filters.months || 12));

  const where: Record<string, unknown> = { month: { gte: since } };
  if (filters.sector) where.sector = filters.sector;
  if (filters.item) where.item = filters.item;
  if (filters.city) where.city = filters.city;

  return prisma.unitPriceIndex.findMany({
    where,
    orderBy: [{ month: "desc" }, { item: "asc" }],
  });
}

export async function getLatestPrices(sector?: string, limit: number = 30) {
  const where: Record<string, unknown> = {};
  if (sector) where.sector = sector;

  // En son ay
  const latest = await prisma.unitPriceIndex.findFirst({
    where,
    orderBy: { month: "desc" },
    select: { month: true },
  });

  if (!latest) return [];

  return prisma.unitPriceIndex.findMany({
    where: { ...where, month: latest.month, city: null },
    orderBy: { itemLabel: "asc" },
    take: limit,
  });
}

export async function getTrends(sector?: string) {
  const where: Record<string, unknown> = { period: "MONTHLY" };
  if (sector) where.sector = sector;

  return prisma.unitPriceTrend.findMany({
    where,
    orderBy: { itemLabel: "asc" },
  });
}

export async function getRegionalComparison(item: string) {
  return prisma.regionalPriceComparison.findUnique({
    where: { item },
  });
}

export async function getRegionalComparisons(sector?: string) {
  const where: Record<string, unknown> = {};
  if (sector) where.sector = sector;

  return prisma.regionalPriceComparison.findMany({
    where,
    orderBy: { itemLabel: "asc" },
  });
}

export async function getIndexStats() {
  const [totalItems, totalRecords, latestMonth, sectorCounts] = await Promise.all([
    prisma.unitPriceIndex.groupBy({ by: ["item"] }).then((r) => r.length),
    prisma.unitPriceIndex.count(),
    prisma.unitPriceIndex.findFirst({ orderBy: { month: "desc" }, select: { month: true } }),
    prisma.unitPriceIndex.groupBy({
      by: ["sector"],
      _count: true,
      _sum: { sampleCount: true },
    }),
  ]);

  const totalSamples = sectorCounts.reduce((sum, s) => sum + (s._sum.sampleCount || 0), 0);

  return {
    totalItems,
    totalRecords,
    totalSamples,
    latestMonth: latestMonth?.month,
    sectors: sectorCounts.map((s) => ({
      sector: s.sector,
      count: s._count,
      samples: s._sum.sampleCount || 0,
    })),
  };
}

// ─── CSV EXPORT ─────────────────────────────────────────────

export async function exportToCsv(sector?: string) {
  const data = await prisma.unitPriceIndex.findMany({
    where: sector ? { sector } : {},
    orderBy: [{ sector: "asc" }, { item: "asc" }, { month: "desc" }],
  });

  const header = "Sektör;Kalem;Birim;Ortalama Fiyat;Min Fiyat;Max Fiyat;Örneklem;Şehir;Ay;Kaynak\n";
  const rows = data.map((d) =>
    [
      d.sector,
      d.itemLabel,
      d.unit,
      Number(d.avgPrice).toFixed(2),
      Number(d.minPrice).toFixed(2),
      Number(d.maxPrice).toFixed(2),
      d.sampleCount,
      d.city || "Türkiye",
      d.month.toISOString().slice(0, 7),
      d.source,
    ].join(";")
  ).join("\n");

  return header + rows;
}

// ─── SEED DATA ──────────────────────────────────────────────

export async function seedPriceIndex() {
  const count = await prisma.unitPriceIndex.count();
  if (count > 0) return;

  const items = [
    // YAPIM
    { sector: "YAPIM", item: "beton-c30", label: "Beton C30/37", unit: "m³", base: 1050 },
    { sector: "YAPIM", item: "beton-c25", label: "Beton C25/30", unit: "m³", base: 950 },
    { sector: "YAPIM", item: "demir-celik", label: "Betonarme Demiri", unit: "ton", base: 14500 },
    { sector: "YAPIM", item: "profil-celik", label: "Profil Çelik", unit: "ton", base: 18200 },
    { sector: "YAPIM", item: "tuğla", label: "Tuğla (19 cm)", unit: "adet", base: 4.5 },
    { sector: "YAPIM", item: "cimento", label: "Çimento (CEM I 42.5)", unit: "ton", base: 1350 },
    { sector: "YAPIM", item: "kum-cakil", label: "Kum-Çakıl", unit: "m³", base: 280 },
    { sector: "YAPIM", item: "kalip-tahtasi", label: "Kalıp Tahtası", unit: "m²", base: 85 },
    { sector: "YAPIM", item: "asfalt", label: "Asfalt Betonu (BSK)", unit: "ton", base: 680 },
    { sector: "YAPIM", item: "boya-dis-cephe", label: "Dış Cephe Boyası", unit: "m²", base: 45 },
    { sector: "YAPIM", item: "seramik", label: "Seramik Kaplama", unit: "m²", base: 120 },
    { sector: "YAPIM", item: "alcipan", label: "Alçıpan Bölme Duvar", unit: "m²", base: 95 },
    { sector: "YAPIM", item: "pvc-dograma", label: "PVC Doğrama", unit: "m²", base: 850 },
    { sector: "YAPIM", item: "su-yalitim", label: "Su Yalıtımı", unit: "m²", base: 110 },
    { sector: "YAPIM", item: "isi-yalitim", label: "Isı Yalıtımı (EPS 5cm)", unit: "m²", base: 75 },
    { sector: "YAPIM", item: "elektrik-tesisat", label: "Elektrik Tesisatı", unit: "m²", base: 180 },
    { sector: "YAPIM", item: "mekanik-tesisat", label: "Mekanik Tesisat", unit: "m²", base: 220 },
    // HIZMET
    { sector: "HIZMET", item: "temizlik-personel", label: "Temizlik Personeli", unit: "gün", base: 550 },
    { sector: "HIZMET", item: "guvenlik-personel", label: "Güvenlik Personeli", unit: "gün", base: 650 },
    { sector: "HIZMET", item: "yemek-hizmeti", label: "Yemek Hizmeti", unit: "adet", base: 42 },
    { sector: "HIZMET", item: "tasima-personel", label: "Personel Taşıma", unit: "km", base: 12 },
    { sector: "HIZMET", item: "danismanlik-muhendis", label: "Mühendislik Danışmanlık", unit: "saat", base: 450 },
    { sector: "HIZMET", item: "bilgi-teknolojileri", label: "BT Hizmeti", unit: "gün", base: 1200 },
    // MAL_ALIMI
    { sector: "MAL_ALIMI", item: "bilgisayar-masaustu", label: "Masaüstü Bilgisayar", unit: "adet", base: 28000 },
    { sector: "MAL_ALIMI", item: "bilgisayar-dizustu", label: "Dizüstü Bilgisayar", unit: "adet", base: 35000 },
    { sector: "MAL_ALIMI", item: "yazici-lazer", label: "Lazer Yazıcı", unit: "adet", base: 8500 },
    { sector: "MAL_ALIMI", item: "fotokopi-cihazi", label: "Fotokopi Cihazı", unit: "adet", base: 45000 },
    { sector: "MAL_ALIMI", item: "ofis-mobilya-masa", label: "Ofis Masası", unit: "adet", base: 3500 },
    { sector: "MAL_ALIMI", item: "ofis-mobilya-koltuk", label: "Ofis Koltuğu", unit: "adet", base: 4200 },
    { sector: "MAL_ALIMI", item: "jenerator", label: "Jeneratör (100 kVA)", unit: "adet", base: 320000 },
    { sector: "MAL_ALIMI", item: "klima-split", label: "Split Klima (24000 BTU)", unit: "adet", base: 18000 },
  ];

  const cities = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Konya", "Gaziantep", "Adana"];
  const months: Date[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    months.push(d);
  }

  const records = [];

  for (const item of items) {
    // Ulusal ortalama (city=null)
    for (const month of months) {
      const monthIdx = months.indexOf(month);
      const trend = 1 + (monthIdx * 0.008) + (Math.random() * 0.04 - 0.02);
      const avg = Math.round(item.base * trend * 100) / 100;
      const min = Math.round(avg * (0.85 + Math.random() * 0.05) * 100) / 100;
      const max = Math.round(avg * (1.1 + Math.random() * 0.1) * 100) / 100;

      records.push({
        sector: item.sector,
        item: item.item,
        itemLabel: item.label,
        unit: item.unit,
        avgPrice: avg,
        minPrice: min,
        maxPrice: max,
        sampleCount: Math.floor(Math.random() * 80) + 20,
        city: null as string | null,
        month,
        source: "IHALE_SONUC",
      });
    }

    // Şehir bazlı (sadece son 3 ay)
    for (const city of cities) {
      for (let m = 0; m < 3; m++) {
        const month = months[months.length - 1 - m];
        const cityFactor = city === "İstanbul" ? 1.15 : city === "Ankara" ? 1.05 : city === "İzmir" ? 1.08 :
          city === "Bursa" ? 1.02 : city === "Antalya" ? 1.06 : city === "Konya" ? 0.92 :
          city === "Gaziantep" ? 0.88 : 0.95;
        const avg = Math.round(item.base * cityFactor * (1 + Math.random() * 0.05) * 100) / 100;
        const min = Math.round(avg * 0.88 * 100) / 100;
        const max = Math.round(avg * 1.15 * 100) / 100;

        records.push({
          sector: item.sector,
          item: item.item,
          itemLabel: item.label,
          unit: item.unit,
          avgPrice: avg,
          minPrice: min,
          maxPrice: max,
          sampleCount: Math.floor(Math.random() * 30) + 5,
          city,
          month,
          source: "IHALE_SONUC",
        });
      }
    }
  }

  // Batch insert
  for (let i = 0; i < records.length; i += 50) {
    await prisma.unitPriceIndex.createMany({
      data: records.slice(i, i + 50),
      skipDuplicates: true,
    });
  }

  // Trend ve bölgesel verileri oluştur
  await updateMonthlyIndex();
}

// ─── SABİTLER ───────────────────────────────────────────────

export const SECTORS = [
  { value: "YAPIM", label: "Yapım İşleri" },
  { value: "HIZMET", label: "Hizmet Alımı" },
  { value: "MAL_ALIMI", label: "Mal Alımı" },
];

export function formatTRY(val: number | string): string {
  return Number(val).toLocaleString("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });
}
