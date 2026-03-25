/**
 * ilan.gov.tr (Resmi İlan Portalı) API Client
 *
 * In production, this would scrape or use API of:
 * https://www.ilan.gov.tr/
 *
 * Required env vars:
 *   ILAN_GOV_API_URL
 */

export interface ResmiIlan {
  ilanNo: string;
  baslik: string;
  kurum: string;
  ilanTuru: "ihale" | "duyuru" | "karar" | "diger";
  yayinTarihi: string;
  il: string;
  icerik: string;
  kaynak: string;
}

export interface IlanSyncResult {
  success: boolean;
  totalFetched: number;
  newRecords: number;
  errors: string[];
  syncedAt: string;
}

const ILAN_GOV_URL = process.env.ILAN_GOV_API_URL || "https://www.ilan.gov.tr/api";

class IlanGovClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = ILAN_GOV_URL;
  }

  async fetchIlanlar(params: {
    tur?: string;
    il?: string;
    tarihBaslangic?: string;
    tarihBitis?: string;
    sayfa?: number;
  }): Promise<ResmiIlan[]> {
    console.log(`[ilan.gov.tr] Fetching: ${this.baseUrl}/ilanlar`, params);

    // Simulated response for demo
    await new Promise((r) => setTimeout(r, 100));

    return [
      {
        ilanNo: "ILN-2026-001234",
        baslik: "Ankara Büyükşehir Belediyesi Yol Yapım İhalesi",
        kurum: "Ankara Büyükşehir Belediyesi",
        ilanTuru: "ihale",
        yayinTarihi: "2026-03-24",
        il: "Ankara",
        icerik: "Ankara ili sınırları içerisinde toplam 45 km yol yapım işi.",
        kaynak: "ilan.gov.tr",
      },
      {
        ilanNo: "ILN-2026-001235",
        baslik: "İstanbul Üniversitesi Laboratuvar Cihazı Alımı",
        kurum: "İstanbul Üniversitesi",
        ilanTuru: "ihale",
        yayinTarihi: "2026-03-24",
        il: "İstanbul",
        icerik: "Fen Fakültesi laboratuvarları için cihaz ve ekipman alımı.",
        kaynak: "ilan.gov.tr",
      },
    ];
  }

  async syncIlanlar(): Promise<IlanSyncResult> {
    return {
      success: true,
      totalFetched: 23,
      newRecords: 7,
      errors: [],
      syncedAt: new Date().toISOString(),
    };
  }
}

export const ilanGov = new IlanGovClient();
