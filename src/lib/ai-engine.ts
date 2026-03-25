import { tenders, type Tender, categories } from "./data";
import { companies } from "./companies";
import { formatCurrency } from "./format";

/* ── Types ─────────────────────────────────────── */

export interface AIRiskAnalysis {
  score: number; // 0-100
  recommendation: "katıl" | "dikkatli" | "riskli";
  strengths: string[];
  risks: string[];
  summary: string;
}

export interface AIDocSummary {
  bullets: string[];
  keyDates: { label: string; date: string }[];
  estimatedEffort: string;
}

export interface AIMatchedTender {
  tender: Tender;
  matchScore: number; // 0-100
  reasons: string[];
}

export interface AIPriceEstimate {
  estimatedMin: number;
  estimatedMax: number;
  recommended: number;
  confidence: number; // 0-100
  basis: string[];
}

export interface AITrendAlert {
  sector: string;
  trend: "increasing" | "decreasing" | "stable";
  changePercent: number;
  period: string;
  insight: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

/* ── Seed random helper ────────────────────────── */

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ── Simulated delay ───────────────────────────── */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ── Risk/Opportunity Analysis ─────────────────── */

export async function analyzeTenderRisk(
  tender: Tender
): Promise<AIRiskAnalysis> {
  await delay(800 + Math.random() * 600);

  const rand = seededRandom(parseInt(tender.id) + 42);
  const daysLeft = Math.ceil(
    (new Date(tender.deadline).getTime() - Date.now()) / 86400000
  );
  const budgetM = tender.estimatedCostValue / 1_000_000;

  const strengths: string[] = [];
  const risks: string[] = [];

  // Budget analysis
  if (budgetM > 100) {
    strengths.push(`Yüksek bütçeli ihale (${formatCurrency(tender.estimatedCostValue)}) — kârlılık potansiyeli yüksek`);
  } else {
    strengths.push(`Orta ölçekli bütçe (${formatCurrency(tender.estimatedCostValue)}) — yönetilebilir risk seviyesi`);
  }

  // Timeline
  if (daysLeft > 14) {
    strengths.push(`Yeterli hazırlık süresi mevcut (${daysLeft} gün)`);
  } else if (daysLeft > 0) {
    risks.push(`Sınırlı hazırlık süresi (${daysLeft} gün) — acil aksiyon gerekli`);
  } else {
    risks.push("Son başvuru tarihi geçmiş");
  }

  // Institution type
  if (tender.institutionType === "bakanlik") {
    strengths.push("Bakanlık ihalesi — ödeme güvencesi yüksek");
    risks.push("Bakanlık bürokrasisi — süreç uzayabilir");
  } else if (tender.institutionType === "belediye") {
    strengths.push("Belediye ihalesi — yerel iş ağı avantajı");
  }

  // Category-specific
  if (tender.category === "Yapım İşleri") {
    strengths.push("Yapım işleri sektörü — iş deneyim belgesi ile avantaj sağlanabilir");
    risks.push("Yoğun rekabet ortamı — fiyat baskısı olabilir");
  }
  if (tender.category === "Bilişim") {
    strengths.push("Bilişim sektöründe marj oranları yüksek");
  }

  // Competition estimate
  const competitorCount = Math.round(3 + rand() * 8);
  if (competitorCount > 7) {
    risks.push(`Tahmini ${competitorCount} rakip — yoğun rekabet bekleniyor`);
  } else {
    strengths.push(`Tahmini ${competitorCount} rakip — orta düzey rekabet`);
  }

  // Type-specific
  if (tender.type === "Açık İhale") {
    risks.push("Açık ihale usulü — tüm firmalara açık, fiyat rekabeti yüksek");
  } else if (tender.type === "Belli İstekliler Arası") {
    strengths.push("Belli istekliler arası — yeterlilik kriteri avantaj sağlar");
  }

  // Score calculation
  let score = 50;
  score += strengths.length * 8;
  score -= risks.length * 10;
  score += daysLeft > 7 ? 10 : -5;
  score += budgetM > 50 ? 5 : 0;
  score = Math.max(15, Math.min(95, score + Math.round(rand() * 15)));

  const recommendation: AIRiskAnalysis["recommendation"] =
    score >= 65 ? "katıl" : score >= 40 ? "dikkatli" : "riskli";

  const summaries = {
    katıl: `Bu ihale, firma profilinize uygun görünmektedir. ${formatCurrency(tender.estimatedCostValue)} bütçeli bu ${tender.category.toLowerCase()} ihalesine katılmanız önerilir. Gerekli belgeleri hazırlayarak başvuru sürecini başlatabilirsiniz.`,
    dikkatli: `Bu ihale fırsat sunmakla birlikte bazı riskler barındırmaktadır. Detaylı maliyet analizi yapılması ve şartname gereksinimlerinin dikkatle incelenmesi önerilir.`,
    riskli: `Bu ihalenin risk seviyesi yüksektir. Sınırlı süre, yoğun rekabet veya sektörel uyumsuzluk nedeniyle dikkatli değerlendirme yapılmalıdır.`,
  };

  return {
    score,
    recommendation,
    strengths,
    risks,
    summary: summaries[recommendation],
  };
}

/* ── Document Summarization ────────────────────── */

export async function summarizeDocument(
  tender: Tender
): Promise<AIDocSummary> {
  await delay(600 + Math.random() * 400);

  const budgetStr = formatCurrency(tender.estimatedCostValue);

  const bullets = [
    `${tender.institution} tarafından ${tender.type} usulü ile gerçekleştirilecek ${tender.category.toLowerCase()} ihalesidir.`,
    `Tahmini bedel ${budgetStr} olup, ${tender.city} ilinde gerçekleştirilecektir.`,
    `İhale kapsamında ${tender.description.split(".")[0].toLowerCase()}.`,
    `İsteklilerden iş deneyim belgesi, bilanço ve banka referans mektubu talep edilmektedir.`,
    `Teklif geçerlilik süresi ihale tarihinden itibaren 60 takvim günüdür.`,
  ];

  const publishDate = new Date(tender.publishDate);
  const deadline = new Date(tender.deadline);

  const keyDates = [
    {
      label: "İlan Tarihi",
      date: publishDate.toLocaleDateString("tr-TR"),
    },
    {
      label: "Son Başvuru",
      date: deadline.toLocaleDateString("tr-TR"),
    },
    {
      label: "İhale Açılış (tahmini)",
      date: new Date(deadline.getTime() + 86400000).toLocaleDateString("tr-TR"),
    },
  ];

  const efforts = ["Düşük", "Orta", "Yüksek", "Çok Yüksek"];
  const effortIdx =
    tender.estimatedCostValue > 500_000_000
      ? 3
      : tender.estimatedCostValue > 50_000_000
        ? 2
        : tender.estimatedCostValue > 5_000_000
          ? 1
          : 0;

  return {
    bullets,
    keyDates,
    estimatedEffort: efforts[effortIdx],
  };
}

/* ── Automatic Tender Matching ─────────────────── */

export async function matchTendersForCompany(
  companySectors: string[],
  companyCity: string,
  maxBudget: number
): Promise<AIMatchedTender[]> {
  await delay(700 + Math.random() * 500);

  const scored = tenders
    .filter((t) => t.status === "active")
    .map((t) => {
      let score = 0;
      const reasons: string[] = [];

      // Sector match
      if (companySectors.some((s) => t.category.includes(s) || s.includes(t.category))) {
        score += 35;
        reasons.push("Sektör uyumu mevcut");
      }

      // City match
      if (t.city === companyCity) {
        score += 20;
        reasons.push("Aynı ilde — lojistik avantaj");
      }

      // Budget fit
      if (t.estimatedCostValue <= maxBudget * 1.5) {
        score += 25;
        reasons.push("Bütçe kapasiteye uygun");
      } else {
        score += 5;
        reasons.push("Bütçe kapasiteyi aşıyor — konsorsiyum değerlendirilebilir");
      }

      // Timeline
      const daysLeft = Math.ceil(
        (new Date(t.deadline).getTime() - Date.now()) / 86400000
      );
      if (daysLeft > 14) {
        score += 15;
        reasons.push("Yeterli hazırlık süresi mevcut");
      } else if (daysLeft > 3) {
        score += 5;
        reasons.push("Sınırlı hazırlık süresi");
      }

      // Random slight variance for realism
      score += Math.round(Math.random() * 10);
      score = Math.min(98, score);

      return { tender: t, matchScore: score, reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  return scored.slice(0, 8);
}

/* ── Price Estimation ──────────────────────────── */

export async function estimatePrice(
  tender: Tender
): Promise<AIPriceEstimate> {
  await delay(900 + Math.random() * 600);

  const rand = seededRandom(parseInt(tender.id) + 7);
  const base = tender.estimatedCostValue;

  // Simulate historical analysis
  const discountFactor = 0.7 + rand() * 0.25; // 70-95% of estimate
  const recommended = Math.round(base * discountFactor);
  const min = Math.round(recommended * 0.85);
  const max = Math.round(recommended * 1.15);
  const confidence = Math.round(55 + rand() * 35);

  const basis: string[] = [
    `Son 12 aydaki benzer ${tender.category.toLowerCase()} ihaleleri analiz edildi`,
    `${tender.city} ili için bölgesel fiyat endeksi uygulandı`,
    `Tahmini bedelin %${Math.round(discountFactor * 100)}'i optimal teklif aralığı olarak hesaplandı`,
    `Geçmiş kazanan tekliflerin ortalaması baz alındı`,
  ];

  if (tender.estimatedCostValue > 100_000_000) {
    basis.push("Yüksek bütçeli ihalelerde marj optimizasyonu uygulandı");
  }

  return {
    estimatedMin: min,
    estimatedMax: max,
    recommended,
    confidence,
    basis,
  };
}

/* ── Trend Analysis ────────────────────────────── */

export async function analyzeTrends(): Promise<AITrendAlert[]> {
  await delay(500 + Math.random() * 400);

  return [
    {
      sector: "Yapım İşleri",
      trend: "increasing",
      changePercent: 23.4,
      period: "Son 3 ay",
      insight:
        "Deprem sonrası yapım ihaleleri belirgin şekilde artış gösteriyor. Özellikle konut ve altyapı projelerinde yoğunluk var.",
    },
    {
      sector: "Bilişim",
      trend: "increasing",
      changePercent: 31.2,
      period: "Son 3 ay",
      insight:
        "Dijital dönüşüm projeleri hız kazandı. e-Devlet ve siber güvenlik ihaleleri öne çıkıyor.",
    },
    {
      sector: "Sağlık",
      trend: "stable",
      changePercent: 2.1,
      period: "Son 3 ay",
      insight:
        "Tıbbi cihaz ve hastane altyapı ihaleleri sabit seyrini koruyor. Yılsonu bütçe artışı bekleniyor.",
    },
    {
      sector: "Hizmet Alımı",
      trend: "decreasing",
      changePercent: -8.7,
      period: "Son 3 ay",
      insight:
        "Güvenlik ve temizlik hizmet alımlarında geçici daralma gözleniyor. Bütçe revizyonu etkisi olabilir.",
    },
    {
      sector: "Danışmanlık",
      trend: "increasing",
      changePercent: 15.8,
      period: "Son 3 ay",
      insight:
        "Büyük ölçekli altyapı projeleri için danışmanlık hizmet ihaleleri artıyor.",
    },
    {
      sector: "Mal Alımı",
      trend: "stable",
      changePercent: -1.3,
      period: "Son 3 ay",
      insight:
        "Tedarik zinciri normalleşmesiyle birlikte mal alımı ihaleleri dengeli seyrediyor.",
    },
    {
      sector: "Ulaşım",
      trend: "increasing",
      changePercent: 18.5,
      period: "Son 3 ay",
      insight:
        "YHT, metro ve otoyol projeleri kapsamında ulaşım sektörü canlanıyor.",
    },
    {
      sector: "Eğitim",
      trend: "decreasing",
      changePercent: -5.2,
      period: "Son 3 ay",
      insight:
        "Eğitim yatırımlarında dönemsel düşüş gözleniyor. Yaz dönemi etkisi bekleniyor.",
    },
  ];
}

/* ── Chatbot Response Engine ───────────────────── */

const chatResponses: Record<string, string[]> = {
  merhaba: [
    "Merhaba! İhalePro AI Asistanı olarak size nasıl yardımcı olabilirim? İhale analizi, fiyat tahmini veya şartname özetleme konularında sorularınızı yanıtlayabilirim.",
  ],
  katılmalı: [
    "İhaleye katılma kararı için birkaç faktörü değerlendirmem gerekiyor:\n\n1. **Firma kapasitesi**: Mevcut iş yükünüz ve deneyiminiz\n2. **Bütçe uyumu**: İhale bedeli ve teklif marjı\n3. **Rekabet analizi**: Sektördeki rakip firma sayısı\n4. **Süre**: Hazırlık için yeterli zaman\n\nDetaylı analiz için ihale sayfasındaki **AI Risk Analizi** butonunu kullanabilirsiniz.",
  ],
  fiyat: [
    "Fiyat tahmini için geçmiş ihale verilerini analiz ediyorum. Genellikle:\n\n• Tahmini bedelin **%70-95** arası teklifler kazanma şansı yüksektir\n• Aşırı düşük sorgulama sınırına dikkat edilmelidir\n• Bölgesel fiyat farklılıkları göz önünde bulundurulmalıdır\n\nSpesifik bir ihale için **AI Fiyat Tahmini** aracını kullanabilirsiniz.",
  ],
  şartname: [
    "Şartname analizi için:\n\n• İdari şartname → Yeterlilik kriterleri ve katılım şartları\n• Teknik şartname → İş kapsamı ve teknik gereksinimler\n• Sözleşme taslağı → Ödeme şartları ve ceza hükümleri\n\nİhale detay sayfasındaki **AI Doküman Özeti** özelliğini kullanarak otomatik özetleme yapabilirsiniz.",
  ],
  trend: [
    "Güncel sektörel trendler:\n\n📈 **Yapım İşleri** +23.4% (deprem sonrası artış)\n📈 **Bilişim** +31.2% (dijital dönüşüm)\n📈 **Ulaşım** +18.5% (altyapı projeleri)\n📉 **Hizmet Alımı** -8.7% (bütçe revizyonu)\n\nDetaylı trend analizi için **AI Özellikleri** sayfasını ziyaret edin.",
  ],
  default: [
    "Bu konuda size yardımcı olabilirim. Aşağıdaki konularda sorularınızı yanıtlayabilirim:\n\n• **\"Bu ihaleye katılmalı mıyım?\"** → Risk/fırsat analizi\n• **\"Fiyat tahmini\"** → Geçmiş verilere dayalı teklif önerisi\n• **\"Şartname özeti\"** → Doküman özetleme\n• **\"Sektör trendi\"** → Trend analizi ve uyarılar\n• **\"Bana uygun ihaleler\"** → Otomatik eşleştirme\n\nHangi konuda destek almak istersiniz?",
  ],
  uygun: [
    "Size uygun ihaleleri bulmak için firma profilinizi analiz ediyorum.\n\n**AI Özellikleri** sayfasındaki **İhale Eşleştirme** aracını kullanarak:\n• Sektör uyumunuzu\n• Bütçe kapasitenizi\n• Coğrafi avantajlarınızı\n\ndikkate alarak en uygun ihaleleri listeleyebilirsiniz.",
  ],
};

export function getChatResponse(message: string): string {
  const lower = message.toLowerCase().replace(/[?!.,]/g, "");

  for (const [key, responses] of Object.entries(chatResponses)) {
    if (key === "default") continue;
    if (lower.includes(key)) {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  // Check for partial matches
  if (lower.includes("analiz") || lower.includes("risk"))
    return chatResponses.katılmalı[0];
  if (lower.includes("teklif") || lower.includes("bedel"))
    return chatResponses.fiyat[0];
  if (lower.includes("belge") || lower.includes("doküman"))
    return chatResponses.şartname[0];
  if (lower.includes("sektör") || lower.includes("piyasa"))
    return chatResponses.trend[0];
  if (lower.includes("eşleş") || lower.includes("öner"))
    return chatResponses.uygun[0];
  if (lower.includes("selam") || lower.includes("günaydın") || lower.includes("iyi"))
    return chatResponses.merhaba[0];

  return chatResponses.default[0];
}
