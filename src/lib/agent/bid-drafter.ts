/**
 * Otonom Teklif Taslağı — Geçmiş kazanan fiyatları analiz edip optimal teklif aralığı öner
 */

import type { Tender } from "@/generated/prisma/client";

export interface BidDraft {
  suggestedMin: number;
  suggestedMax: number;
  optimalBid: number;
  confidence: number; // 0-100
  strategy: string;
  unitPriceItems: BidLineItem[];
  analysisNotes: string[];
  riskFactors: string[];
  winProbability: number; // 0-100
}

export interface BidLineItem {
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface PastResult {
  winningPrice: number;
  averagePrice: number;
  lowestPrice: number;
  bidCount: number;
}

function simulatePastResults(tender: Tender): PastResult {
  const cost = tender.estimatedCost ? Number(tender.estimatedCost) : 10_000_000;

  // Simulate analysis of past similar tenders
  const seed = tender.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pseudoRandom = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  const discountRate = 0.65 + pseudoRandom(1) * 0.25; // 65-90%
  const winningPrice = Math.round(cost * discountRate);
  const averagePrice = Math.round(cost * (discountRate + 0.05));
  const lowestPrice = Math.round(cost * (discountRate - 0.08));
  const bidCount = 3 + Math.round(pseudoRandom(2) * 10);

  return { winningPrice, averagePrice, lowestPrice, bidCount };
}

function generateUnitPriceItems(tender: Tender, totalBid: number): BidLineItem[] {
  const items: BidLineItem[] = [];

  if (tender.tenderType === "YAPIM") {
    const itemDefs = [
      { desc: "Kazı işleri (her derinlikte)", unit: "m³", qtyRatio: 0.08 },
      { desc: "Beton (C30/37)", unit: "m³", qtyRatio: 0.22 },
      { desc: "Demir donatı (nervürlü)", unit: "ton", qtyRatio: 0.15 },
      { desc: "Kalıp işleri", unit: "m²", qtyRatio: 0.10 },
      { desc: "İnce yapı işleri", unit: "m²", qtyRatio: 0.18 },
      { desc: "Mekanik tesisat", unit: "takım", qtyRatio: 0.12 },
      { desc: "Elektrik tesisat", unit: "takım", qtyRatio: 0.10 },
      { desc: "Nakliye ve genel giderler", unit: "kalem", qtyRatio: 0.05 },
    ];
    for (const item of itemDefs) {
      const total = Math.round(totalBid * item.qtyRatio);
      const qty = Math.max(1, Math.round(total / (1000 + Math.random() * 5000)));
      items.push({
        description: item.desc,
        unit: item.unit,
        quantity: qty,
        unitPrice: Math.round(total / qty),
        totalPrice: total,
      });
    }
  } else if (tender.tenderType === "HIZMET") {
    const itemDefs = [
      { desc: "Personel maliyeti", unit: "ay", qtyRatio: 0.45 },
      { desc: "Ekipman ve malzeme", unit: "kalem", qtyRatio: 0.20 },
      { desc: "Ulaşım ve lojistik", unit: "ay", qtyRatio: 0.10 },
      { desc: "Sigorta ve teminat", unit: "kalem", qtyRatio: 0.08 },
      { desc: "Genel gider ve kâr", unit: "kalem", qtyRatio: 0.17 },
    ];
    for (const item of itemDefs) {
      const total = Math.round(totalBid * item.qtyRatio);
      const qty = item.unit === "ay" ? 12 : 1;
      items.push({
        description: item.desc,
        unit: item.unit,
        quantity: qty,
        unitPrice: Math.round(total / qty),
        totalPrice: total,
      });
    }
  } else {
    // MAL_ALIMI / DANISMANLIK
    const itemDefs = [
      { desc: "Ana kalem", unit: "adet", qtyRatio: 0.55 },
      { desc: "Yedek parça / destek", unit: "kalem", qtyRatio: 0.15 },
      { desc: "Kurulum ve eğitim", unit: "kalem", qtyRatio: 0.15 },
      { desc: "Garanti ve bakım", unit: "yıl", qtyRatio: 0.15 },
    ];
    for (const item of itemDefs) {
      const total = Math.round(totalBid * item.qtyRatio);
      const qty = item.unit === "yıl" ? 2 : Math.max(1, Math.round(Math.random() * 10));
      items.push({
        description: item.desc,
        unit: item.unit,
        quantity: qty,
        unitPrice: Math.round(total / qty),
        totalPrice: total,
      });
    }
  }

  return items;
}

export function draftBid(
  tender: Tender,
  competitorCount: number
): BidDraft {
  const past = simulatePastResults(tender);
  const cost = tender.estimatedCost ? Number(tender.estimatedCost) : 10_000_000;

  // Strategy based on competition level
  let strategyType: "aggressive" | "balanced" | "conservative";
  let optimalRate: number;

  if (competitorCount > 8) {
    strategyType = "aggressive";
    optimalRate = 0.68 + Math.random() * 0.07; // 68-75%
  } else if (competitorCount > 4) {
    strategyType = "balanced";
    optimalRate = 0.73 + Math.random() * 0.09; // 73-82%
  } else {
    strategyType = "conservative";
    optimalRate = 0.80 + Math.random() * 0.10; // 80-90%
  }

  const optimalBid = Math.round(cost * optimalRate);
  const suggestedMin = Math.round(optimalBid * 0.92);
  const suggestedMax = Math.round(optimalBid * 1.08);

  // Aşırı düşük sınırı (sınır değer) - KİK formülü basitleştirmesi
  const asiriDusukSinir = Math.round(cost * 0.60);
  const winProbability = Math.min(85, Math.max(10,
    50 + (competitorCount < 5 ? 20 : -10) + (optimalRate < 0.78 ? 10 : 0)
  ));

  const strategies = {
    aggressive: `Agresif strateji önerilir. ${competitorCount} rakip nedeniyle rekabetçi fiyat kritik. Aşırı düşük sınırına (${(asiriDusukSinir / 1_000_000).toFixed(1)}M ₺) dikkat edin.`,
    balanced: `Dengeli strateji önerilir. Orta düzey rekabet ortamında kalite-fiyat dengesi kazandırır.`,
    conservative: `Konservatif strateji önerilir. Düşük rekabet avantajını kullanarak makul marj bırakabilirsiniz.`,
  };

  const analysisNotes = [
    `Benzer ihalelerde ortalama kazanan fiyat: tahmini bedelin %${Math.round(past.winningPrice / cost * 100)}'i`,
    `Geçmiş ihalelerde ortalama ${past.bidCount} firma teklif vermiş`,
    `Optimal teklif aralığı: ${(suggestedMin / 1_000_000).toFixed(2)}M — ${(suggestedMax / 1_000_000).toFixed(2)}M ₺`,
    `Tahmini kazanma olasılığı: %${winProbability}`,
  ];

  const riskFactors = [
    optimalBid < asiriDusukSinir
      ? "UYARI: Önerilen fiyat aşırı düşük sınırının altında!"
      : `Aşırı düşük sınırından ${((optimalBid - asiriDusukSinir) / 1_000_000).toFixed(2)}M ₺ yukarıda`,
    competitorCount > 8
      ? "Yoğun rekabet — son dakika fiyat düşüşlerine hazır olun"
      : "Rekabet düzeyi yönetilebilir",
    "Malzeme fiyat artışları için %5 tampon bırakılması önerilir",
  ];

  const unitPriceItems = generateUnitPriceItems(tender, optimalBid);

  return {
    suggestedMin,
    suggestedMax,
    optimalBid,
    confidence: Math.min(85, 40 + Math.round(Math.random() * 30)),
    strategy: strategies[strategyType],
    unitPriceItems,
    analysisNotes,
    riskFactors,
    winProbability,
  };
}
