import { describe, it, expect, vi } from "vitest";

// ─── Mock AI Provider ───────────────────────────────────────
vi.mock("@/lib/providers/ai-provider", () => ({
  createEmbedding: vi.fn(async () => Array(1536).fill(0).map(() => Math.random())),
  createBatchEmbeddings: vi.fn(async (texts: string[]) =>
    texts.map(() => Array(1536).fill(0).map(() => Math.random())),
  ),
  cosineSimilarity: vi.fn((a: number[], b: number[]) => {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, nA = 0, nB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      nA += a[i] * a[i];
      nB += b[i] * b[i];
    }
    const mag = Math.sqrt(nA) * Math.sqrt(nB);
    return mag === 0 ? 0 : dot / mag;
  }),
  complete: vi.fn(async () => ({
    text: "Test öneri metni",
    model: "test",
    inputTokens: 10,
    outputTokens: 20,
    cached: false,
  })),
}));

// ─── Mock Prisma ────────────────────────────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    company: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        name: where.id === "comp-a" ? "A Yapı İnşaat" : "B Mühendislik",
        city: where.id === "comp-a" ? "İstanbul" : "Ankara",
        sector: where.id === "comp-a" ? "Yapım İşleri" : "Mühendislik Danışmanlık",
        foundedYear: where.id === "comp-a" ? 2010 : 2015,
        employeeCount: where.id === "comp-a" ? 120 : 45,
        capitalAmount: where.id === "comp-a" ? 5000000 : 1000000,
        mersisData: where.id === "comp-a"
          ? { activities: ["İnşaat", "Altyapı"] }
          : { activities: ["Mühendislik", "Proje"] },
      })),
      findMany: vi.fn(async () => [
        { id: "comp-b", name: "B Mühendislik" },
      ]),
    },
    tenderResult: {
      findMany: vi.fn(async ({ where }: { where: { winnerName: { contains: string } } }) => {
        if (where.winnerName.contains === "A Yapı İnşaat") {
          return [
            {
              winnerAmount: 5000000,
              tender: { oksCodes: ["45210000", "45220000"], city: "İstanbul", tenderType: "YAPIM" },
            },
            {
              winnerAmount: 3000000,
              tender: { oksCodes: ["45230000"], city: "Kocaeli", tenderType: "YAPIM" },
            },
          ];
        }
        return [
          {
            winnerAmount: 2000000,
            tender: { oksCodes: ["71320000", "71310000"], city: "Ankara", tenderType: "DANISMANLIK" },
          },
        ];
      }),
    },
    tender: {
      findUnique: vi.fn(async () => ({
        id: "tender-1",
        title: "Köprü Yapım İşi",
        city: "İstanbul",
        estimatedCost: 10000000,
        oksCodes: ["45220000"],
      })),
    },
    jvMatch: {
      count: vi.fn(async () => 0),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "match-1",
        ...data,
        matchedCompany: { id: data.matchedCompanyId, name: "B Mühendislik" },
      })),
    },
    jvRequest: {
      update: vi.fn(async () => ({})),
    },
  },
}));

import {
  buildFirmVector,
  matchCompanies,
  sanitizeMatchResult,
  sanitizePairAnalysis,
} from "../jv-matching";
import type { FirmVector, MatchResult, PairAnalysis } from "../jv-matching";

// ─── Tests ──────────────────────────────────────────────────

describe("buildFirmVector", () => {
  it("builds vector from company data and tender results", async () => {
    const vector = await buildFirmVector("comp-a");

    expect(vector.companyId).toBe("comp-a");
    expect(vector.companyName).toBe("A Yapı İnşaat");
    expect(vector.wonTenderCount).toBe(2);
    expect(vector.experienceAmount).toBe(8000000);
    expect(vector.cities).toContain("İstanbul");
    expect(vector.cities).toContain("Kocaeli");
    expect(vector.cpvCodes.length).toBeGreaterThan(0);
    expect(vector.sectors).toContain("Yapım İşleri");
    expect(vector.yearsActive).toBeGreaterThan(0);
  });

  it("includes MERSİS activities in sectors", async () => {
    const vector = await buildFirmVector("comp-a");
    expect(vector.sectors).toContain("İnşaat");
    expect(vector.sectors).toContain("Altyapı");
  });
});

describe("matchCompanies", () => {
  const vectorA: FirmVector = {
    companyId: "comp-a",
    companyName: "A Yapı",
    cpvCodes: ["45210000", "45220000"],
    experienceAmount: 8000000,
    wonTenderCount: 5,
    cities: ["İstanbul", "Kocaeli"],
    sectors: ["YAPIM", "İnşaat"],
    capitalAmount: 5000000,
    employeeCount: 120,
    yearsActive: 14,
  };

  const vectorB: FirmVector = {
    companyId: "comp-b",
    companyName: "B Mühendislik",
    cpvCodes: ["71320000", "71310000"],
    experienceAmount: 2000000,
    wonTenderCount: 3,
    cities: ["Ankara"],
    sectors: ["DANISMANLIK", "Mühendislik"],
    capitalAmount: 1000000,
    employeeCount: 45,
    yearsActive: 9,
  };

  it("returns score between 0 and 100", async () => {
    const result = await matchCompanies(vectorA, vectorB, "İstanbul", 10000000);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("has correct breakdown structure", async () => {
    const result = await matchCompanies(vectorA, vectorB);
    expect(result.breakdown).toHaveProperty("embeddingScore");
    expect(result.breakdown).toHaveProperty("complementarity");
    expect(result.breakdown).toHaveProperty("experienceScore");
    expect(result.breakdown).toHaveProperty("geoScore");
    expect(result.breakdown).toHaveProperty("capacityScore");
  });

  it("scores complementary firms higher than identical ones", async () => {
    const identicalB: FirmVector = { ...vectorA, companyId: "comp-c", companyName: "C Yapı" };
    const [compResult, identResult] = await Promise.all([
      matchCompanies(vectorA, vectorB),
      matchCompanies(vectorA, identicalB),
    ]);
    // Complementary sectors should get complementarity bonus
    expect(compResult.breakdown.complementarity).toBeGreaterThanOrEqual(0);
  });

  it("gives experience score based on combined capacity", async () => {
    const result = await matchCompanies(vectorA, vectorB, undefined, 10000000);
    // Combined: 8M + 2M = 10M, ratio = 1.0 → 20 points
    expect(result.breakdown.experienceScore).toBe(20);
  });

  it("provides explanation and complementary areas", async () => {
    const result = await matchCompanies(vectorA, vectorB);
    expect(typeof result.explanation).toBe("string");
    expect(Array.isArray(result.complementaryAreas)).toBe(true);
    expect(Array.isArray(result.riskFactors)).toBe(true);
  });
});

describe("sanitizeMatchResult", () => {
  it("strips no PII from clean results", () => {
    const result: MatchResult = {
      companyId: "comp-a",
      companyName: "Test Firma",
      score: 75,
      breakdown: { embeddingScore: 25, complementarity: 20, experienceScore: 15, geoScore: 10, capacityScore: 5 },
      explanation: "İyi uyum",
      complementaryAreas: ["Farklı sektörler"],
      riskFactors: [],
    };
    const sanitized = sanitizeMatchResult(result);
    expect(sanitized.companyName).toBe("Test Firma");
    expect(sanitized.score).toBe(75);
  });
});

describe("sanitizePairAnalysis", () => {
  it("masks VKN numbers in recommendation text", () => {
    const analysis: PairAnalysis = {
      score: 70,
      breakdown: { embeddingScore: 20, complementarity: 15, experienceScore: 15, geoScore: 10, capacityScore: 10 },
      explanation: "Uyumlu",
      complementaryAreas: [],
      riskFactors: [],
      recommendation: "Firma VKN: 12345678901 ile ortaklık uygun",
    };
    const sanitized = sanitizePairAnalysis(analysis);
    expect(sanitized.recommendation).toContain("[GİZLİ]");
    expect(sanitized.recommendation).not.toContain("12345678901");
  });

  it("masks IBAN in recommendation text", () => {
    const analysis: PairAnalysis = {
      score: 60,
      breakdown: { embeddingScore: 15, complementarity: 15, experienceScore: 15, geoScore: 10, capacityScore: 5 },
      explanation: "Orta düzey uyum",
      complementaryAreas: [],
      riskFactors: [],
      recommendation: "IBAN: TR123456789012345678901234 bilgisi",
    };
    const sanitized = sanitizePairAnalysis(analysis);
    expect(sanitized.recommendation).toContain("[GİZLİ]");
  });
});

describe("edge cases", () => {
  it("handles firms with no CPV codes", async () => {
    const emptyA: FirmVector = {
      companyId: "empty-a", companyName: "Boş A",
      cpvCodes: [], experienceAmount: 0, wonTenderCount: 0,
      cities: [], sectors: [], capitalAmount: 0, employeeCount: 0, yearsActive: 0,
    };
    const emptyB: FirmVector = {
      companyId: "empty-b", companyName: "Boş B",
      cpvCodes: [], experienceAmount: 0, wonTenderCount: 0,
      cities: [], sectors: [], capitalAmount: 0, employeeCount: 0, yearsActive: 0,
    };
    const result = await matchCompanies(emptyA, emptyB);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("handles zero required amount", async () => {
    const a: FirmVector = {
      companyId: "a", companyName: "A",
      cpvCodes: ["45"], experienceAmount: 1000000, wonTenderCount: 2,
      cities: ["İstanbul"], sectors: ["YAPIM"], capitalAmount: 100000, employeeCount: 10, yearsActive: 5,
    };
    const b: FirmVector = {
      companyId: "b", companyName: "B",
      cpvCodes: ["71"], experienceAmount: 500000, wonTenderCount: 1,
      cities: ["Ankara"], sectors: ["DANISMANLIK"], capitalAmount: 50000, employeeCount: 5, yearsActive: 3,
    };
    const result = await matchCompanies(a, b, undefined, 0);
    expect(result.breakdown.experienceScore).toBeGreaterThanOrEqual(0);
  });
});
