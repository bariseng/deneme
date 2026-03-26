import { prisma } from "@/lib/prisma";
import { ProviderCache } from "./cache";

// --- Interfaces ---

export interface MersisCompany {
  readonly mersisNo: string;
  readonly name: string;
  readonly taxNumber: string;
  readonly taxOffice: string;
  readonly foundedAt: string;
  readonly status: string;
  readonly companyType: string;
  readonly capital: number;
  readonly address: string;
  readonly province: string;
  readonly tradeRegNo: string;
}

// --- Constants ---

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// NOTE: MERSİS requires authentication for full access. Public query is very limited.
// This provider queries our OWN database (Company table populated from EKAP tender results).
// MERSİS data enrichment requires manual import or e-Devlet integration.

function companyToMersis(company: {
  name: string;
  taxNumber: string | null;
  taxOffice: string | null;
  address: string | null;
  city: string | null;
  companyType: string | null;
  capitalAmount: { toNumber(): number } | null;
  tradeRegNo: string | null;
  externalMersisId: string | null;
  foundedYear: number | null;
}): MersisCompany {
  return {
    mersisNo: company.externalMersisId ?? "",
    name: company.name,
    taxNumber: company.taxNumber ?? "",
    taxOffice: company.taxOffice ?? "",
    foundedAt: company.foundedYear ? String(company.foundedYear) : "",
    status: "Aktif",
    companyType: company.companyType ?? "",
    capital: company.capitalAmount?.toNumber() ?? 0,
    address: company.address ?? "",
    province: company.city ?? "",
    tradeRegNo: company.tradeRegNo ?? "",
  };
}

// --- Provider class ---

class MersisProvider {
  private readonly cache: ProviderCache;

  constructor() {
    this.cache = new ProviderCache("mersis", CACHE_TTL_MS);
  }

  /**
   * Search companies from our own Company table (populated via EKAP tender results).
   * MERSİS external API requires authentication — not usable for direct queries.
   */
  async searchCompany(query: string): Promise<MersisCompany[]> {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return [];
    }

    const cacheKey = `search:${trimmed.toLowerCase()}`;
    const cached = await this.cache.get<MersisCompany[]>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    try {
      const companies = await prisma.company.findMany({
        where: {
          OR: [
            { name: { contains: trimmed, mode: "insensitive" } },
            { taxNumber: trimmed },
            { externalMersisId: trimmed },
          ],
        },
        take: 20,
      });

      const results = companies.map(companyToMersis);
      this.cache.set(cacheKey, results);
      return results;
    } catch {
      return [];
    }
  }

  /**
   * Look up company by MERSİS number from our own database.
   */
  async getByMersisNo(mersisNo: string): Promise<MersisCompany | null> {
    const trimmed = mersisNo.trim();
    if (trimmed.length === 0) {
      return null;
    }

    const cacheKey = `mersis:${trimmed}`;
    const cached = await this.cache.get<MersisCompany>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    try {
      const company = await prisma.company.findFirst({
        where: { externalMersisId: trimmed },
      });

      if (!company) return null;

      const result = companyToMersis(company);
      this.cache.set(cacheKey, result);
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Look up company by tax number (VKN) from our own database.
   */
  async getByTaxNumber(vkn: string): Promise<MersisCompany | null> {
    const trimmed = vkn.trim();
    if (trimmed.length === 0) {
      return null;
    }

    const cacheKey = `vkn:${trimmed}`;
    const cached = await this.cache.get<MersisCompany>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    try {
      const company = await prisma.company.findFirst({
        where: { taxNumber: trimmed },
      });

      if (!company) return null;

      const result = companyToMersis(company);
      this.cache.set(cacheKey, result);
      return result;
    } catch {
      return null;
    }
  }
}

// --- Singleton export ---

export const mersisProvider = new MersisProvider();
