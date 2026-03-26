#!/usr/bin/env npx tsx
// ─── Initial EKAP Sync — 5 Year Backfill ────────────────────
// Fetches ALL tenders from 2021-2026, month by month
// Checkpoints to DataSyncLog so interrupted runs can resume
// Run: npx tsx scripts/initial-ekap-sync.ts [--from=2021] [--to=2026] [--resume]

import "dotenv/config";
import { resolve } from "path";

// Also load .env.local (higher priority)
import dotenv from "dotenv";
dotenv.config({ path: resolve(process.cwd(), ".env.local"), override: true });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL || "";
const adapter = new PrismaPg({ connectionString: url, max: 5 });
const prisma = new PrismaClient({ adapter });

// ─── Config ─────────────────────────────────────────────────

const EKAP_BASE_URL = process.env.EKAP_BASE_URL || "https://ekapv2.kik.gov.tr";
const PAGE_SIZE = 100;
const RATE_LIMIT_MS = 1500;
const CHECKPOINT_PROVIDER = "EKAP_INITIAL_SYNC";

const EKAP_HEADERS: Record<string, string> = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "api-version": "v1",
  Origin: "https://ekapv2.kik.gov.tr",
  Referer: "https://ekapv2.kik.gov.tr/ekap/search",
  "Accept-Language": "tr",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  "sec-ch-ua": '"Chromium";"v="138", "Google Chrome";v="138"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
};

const TENDER_TYPE_MAP: Record<string, string> = {
  "1": "MAL_ALIMI",
  "2": "YAPIM",
  "3": "HIZMET",
  "4": "DANISMANLIK",
  "Yapım": "YAPIM",
  "Mal Alımı": "MAL_ALIMI",
  "Hizmet Alımı": "HIZMET",
  "Hizmet": "HIZMET",
  "Danışmanlık Hizmet Alımı": "DANISMANLIK",
};

const STATUS_MAP: Record<string, string> = {
  "1": "YAKLASAN",
  "2": "BASVURU_ACIK",
  "3": "DEGERLENDIRME",
  "4": "SONUCLANDI",
  "5": "IPTAL",
};

// ─── Types ──────────────────────────────────────────────────

interface EkapTenderRaw {
  id?: string;
  ihaleId?: number;
  ihaleAdi: string;
  ikn?: string;
  iknYili?: number;
  iknSayi?: number;
  idareAdi: string;
  ihaleIlAdi?: string;
  il?: string;
  ilce?: string;
  ihaleTarihSaat?: string;
  ihaleTarihi?: string;
  yaklesikMaliyet?: number;
  ihaleTip?: string;
  ihaleTipAciklama?: string;
  ihaleTuru?: string;
  ihaleDurum?: string;
  ihaleDurumAciklama?: string;
  ihaleDurumId?: number;
  ihaleDurumu?: string;
  eIhale?: boolean;
  yabanciIsteklilereIzinVeriliyorMu?: boolean;
  kismiTeklifMi?: boolean;
  ortakAlimMi?: boolean;
  ilanTuru?: string;
  ilanTarihi?: string;
  ilanVarMi?: boolean;
  okasKodlar?: string[];
  aciklama?: string;
  teminatOrani?: number;
  iletisimAdi?: string;
  iletisimTelefon?: string;
  iletisimEposta?: string;
  dokumanSayisi?: number;
}

interface EkapListResponse {
  list: EkapTenderRaw[];
  totalCount: number;
}

// ─── Helpers ────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${lastDay}T23:59:59.999Z`;
  return { start, end };
}

function mapTenderType(ekapType?: string): string {
  if (!ekapType) return "HIZMET";
  return TENDER_TYPE_MAP[ekapType] ?? "HIZMET";
}

function mapStatus(durumCode?: string | number): string {
  if (!durumCode) return "BASVURU_ACIK";
  const key = String(durumCode);
  return STATUS_MAP[key] ?? "BASVURU_ACIK";
}

// ─── EKAP API Call ──────────────────────────────────────────

async function fetchEkapPage(
  dateStart: string,
  dateEnd: string,
  page: number,
): Promise<EkapListResponse> {
  const body = {
    searchText: "",
    filterType: null,
    ikNdeAra: true,
    ihaleAdindaAra: true,
    searchType: "GirdigimGibi",
    iknYili: null,
    iknSayi: null,
    ihaleTarihSaatBaslangic: dateStart,
    ihaleTarihSaatBitis: dateEnd,
    ilanTarihSaatBaslangic: null,
    ilanTarihSaatBitis: null,
    idareKodList: [],
    yasaKapsami4734List: [],
    ihaleTuruIdList: [],
    ihaleUsulIdList: [],
    ihaleUsulAltIdList: [],
    ihaleIlIdList: [],
    ihaleDurumIdList: [],
    idareIdList: [],
    ihaleIlanTuruIdList: [],
    teklifTuruIdList: [],
    asiriDusukTeklifIdList: [],
    istisnaMaddeIdList: [],
    okasBransKodList: [],
    okasBransAdiList: [],
    titubbKodList: [],
    gmdnKodList: [],
    eIhale: null,
    ortakAlimMi: null,
    kismiTeklifMi: null,
    yabanciIsteklilereIzinVeriliyorMu: null,
    orderBy: "ihaleTarihi",
    siralamaTipi: "desc",
    paginationSkip: (page - 1) * PAGE_SIZE,
    paginationTake: PAGE_SIZE,
  };

  const url = `${EKAP_BASE_URL}/b_ihalearama/api/Ihale/GetListByParameters`;

  const res = await fetch(url, {
    method: "POST",
    headers: EKAP_HEADERS,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`EKAP API error: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as EkapListResponse;
}

// ─── Upsert Batch ───────────────────────────────────────────

async function upsertBatch(tenders: EkapTenderRaw[]): Promise<{
  inserted: number;
  updated: number;
  errors: number;
}> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  // v2 API returns ikn as "YYYY/NNNNNN", legacy uses iknYili/iknSayi
  const ekapNos = tenders
    .map((t) => t.ikn ?? (t.iknYili && t.iknSayi ? `${t.iknYili}/${t.iknSayi}` : null))
    .filter((n): n is string => n !== null);
  const existing = await prisma.tender.findMany({
    where: { ekapNo: { in: ekapNos } },
    select: { ekapNo: true },
  });
  const existingSet = new Set(existing.map((e: { ekapNo: string | null }) => e.ekapNo));

  for (const raw of tenders) {
    try {
      const ekapNo = raw.ikn ?? (raw.iknYili && raw.iknSayi ? `${raw.iknYili}/${raw.iknSayi}` : null);
      if (!ekapNo) { errors++; continue; }

      // Parse v2 date "28.04.2026 10:30" or ISO date
      const dateStr = raw.ihaleTarihSaat ?? raw.ihaleTarihi ?? "";
      let deadline: Date;
      const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/);
      if (match) {
        const [, day, month, year, hour, minute] = match;
        deadline = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
      } else {
        deadline = new Date(dateStr || Date.now());
      }

      const data = {
        ekapNo,
        title: raw.ihaleAdi,
        institution: raw.idareAdi,
        city: raw.ihaleIlAdi ?? raw.il ?? "",
        district: raw.ilce ?? null,
        tenderType: mapTenderType(raw.ihaleTip ?? raw.ihaleTipAciklama ?? raw.ihaleTuru) as "YAPIM" | "MAL_ALIMI" | "HIZMET" | "DANISMANLIK",
        status: mapStatus(raw.ihaleDurum ?? raw.ihaleDurumId) as "BASVURU_ACIK" | "DEGERLENDIRME" | "SONUCLANDI" | "IPTAL" | "YAKLASAN",
        deadline,
        publishDate: raw.ilanTarihi ? new Date(raw.ilanTarihi) : new Date(),
        estimatedCost: raw.yaklesikMaliyet ?? null,
        guaranteeRate: raw.teminatOrani ?? null,
        description: raw.aciklama ?? null,
        source: "EKAP",
        eIhale: raw.eIhale ?? false,
        foreignAllowed: raw.yabanciIsteklilereIzinVeriliyorMu ?? false,
        partialBid: raw.kismiTeklifMi ?? false,
        jointPurchase: raw.ortakAlimMi ?? false,
        announcementType: raw.ilanTuru ?? null,
        oksCodes: raw.okasKodlar ? JSON.parse(JSON.stringify(raw.okasKodlar)) : null,
        contactPerson: raw.iletisimAdi ?? null,
        contactPhone: raw.iletisimTelefon ?? null,
        contactEmail: raw.iletisimEposta ?? null,
      };

      await prisma.tender.upsert({
        where: { ekapNo },
        update: {
          title: data.title,
          institution: data.institution,
          city: data.city,
          district: data.district,
          tenderType: data.tenderType,
          status: data.status,
          deadline: data.deadline,
          estimatedCost: data.estimatedCost,
          description: data.description,
          source: data.source,
          eIhale: data.eIhale,
          foreignAllowed: data.foreignAllowed,
          partialBid: data.partialBid,
          jointPurchase: data.jointPurchase,
          announcementType: data.announcementType,
          oksCodes: data.oksCodes,
          contactPerson: data.contactPerson,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
        },
        create: data,
      });

      if (existingSet.has(ekapNo)) updated++;
      else inserted++;
    } catch {
      errors++;
    }
  }

  return { inserted, updated, errors };
}

// ─── Checkpoint Management ──────────────────────────────────

async function getLastCheckpoint(): Promise<string | null> {
  const last = await prisma.dataSyncLog.findFirst({
    where: {
      provider: CHECKPOINT_PROVIDER,
      status: "COMPLETED",
    },
    orderBy: { completedAt: "desc" },
  });
  return last?.operation ?? null;
}

async function saveCheckpoint(monthKey: string, recordCount: number): Promise<void> {
  await prisma.dataSyncLog.create({
    data: {
      provider: CHECKPOINT_PROVIDER,
      operation: monthKey,
      status: "COMPLETED",
      recordCount,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });
}

async function saveFailure(monthKey: string, error: string): Promise<void> {
  await prisma.dataSyncLog.create({
    data: {
      provider: CHECKPOINT_PROVIDER,
      operation: monthKey,
      status: "FAILED",
      errorMessage: error,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });
}

// ─── Generate Month List ────────────────────────────────────

function generateMonths(fromYear: number, toYear: number): Array<{ year: number; month: number }> {
  const months: Array<{ year: number; month: number }> = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Work backwards: most recent data first
  for (let year = toYear; year >= fromYear; year--) {
    const maxMonth = year === currentYear ? currentMonth : 12;
    const minMonth = 1;
    for (let month = maxMonth; month >= minMonth; month--) {
      months.push({ year, month });
    }
  }

  return months;
}

// ─── Main Sync Function ────────────────────────────────────

async function runInitialSync(options: {
  fromYear: number;
  toYear: number;
  resume: boolean;
}): Promise<void> {
  const { fromYear, toYear, resume } = options;

  console.log("\n" + "═".repeat(60));
  console.log("  EKAP İLK YÜKLEME — 5 Yıllık Veri Çekimi");
  console.log("═".repeat(60));
  console.log(`  Dönem: ${fromYear} → ${toYear}`);
  console.log(`  Devam modu: ${resume ? "EVET" : "HAYIR"}`);
  console.log(`  Rate limit: ${RATE_LIMIT_MS}ms/istek`);
  console.log(`  Sayfa boyutu: ${PAGE_SIZE}`);
  console.log("");

  const months = generateMonths(fromYear, toYear);
  let lastCheckpoint: string | null = null;

  if (resume) {
    lastCheckpoint = await getLastCheckpoint();
    if (lastCheckpoint) {
      console.log(`  Son checkpoint: ${lastCheckpoint}`);
    } else {
      console.log("  Önceki checkpoint bulunamadı — baştan başlıyor");
    }
  }

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  let monthsProcessed = 0;
  let skippedMonths = 0;
  const startTime = Date.now();

  for (const { year, month } of months) {
    const monthKey = formatMonth(year, month);

    // Skip already-completed months in resume mode
    if (resume && lastCheckpoint && monthKey >= lastCheckpoint) {
      // We process from newest to oldest, so skip months already done
      // Check if this specific month has a checkpoint
      const existing = await prisma.dataSyncLog.findFirst({
        where: {
          provider: CHECKPOINT_PROVIDER,
          operation: monthKey,
          status: "COMPLETED",
        },
      });
      if (existing) {
        skippedMonths++;
        continue;
      }
    }

    const { start, end } = getMonthRange(year, month);
    let page = 1;
    let monthInserted = 0;
    let monthUpdated = 0;
    let monthErrors = 0;
    let hasMore = true;

    process.stdout.write(`  ${monthKey}: `);

    try {
      while (hasMore) {
        await sleep(RATE_LIMIT_MS);

        const response = await fetchEkapPage(start, end, page);

        if (response.list.length === 0) {
          hasMore = false;
          break;
        }

        const result = await upsertBatch(response.list);
        monthInserted += result.inserted;
        monthUpdated += result.updated;
        monthErrors += result.errors;

        process.stdout.write(".");

        if (page * PAGE_SIZE >= response.totalCount) {
          hasMore = false;
        }

        page++;

        // Safety: max 500 pages per month (50,000 tenders)
        if (page > 500) {
          console.log(" [MAX PAGE LIMIT]");
          break;
        }
      }

      await saveCheckpoint(monthKey, monthInserted + monthUpdated);

      totalInserted += monthInserted;
      totalUpdated += monthUpdated;
      totalErrors += monthErrors;
      monthsProcessed++;

      const total = monthInserted + monthUpdated;
      console.log(` ${total} kayıt (+${monthInserted} yeni, ~${monthUpdated} güncelleme${monthErrors > 0 ? `, ✗${monthErrors} hata` : ""})`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(` HATA: ${msg}`);
      await saveFailure(monthKey, msg);
      totalErrors++;

      // Continue with next month instead of aborting
      continue;
    }
  }

  const durationMs = Date.now() - startTime;
  const durationMin = Math.round(durationMs / 60000);

  console.log("\n" + "─".repeat(60));
  console.log("  SONUÇ");
  console.log("─".repeat(60));
  console.log(`  Süre: ${durationMin} dakika`);
  console.log(`  İşlenen ay: ${monthsProcessed} / ${months.length}${skippedMonths > 0 ? ` (${skippedMonths} atlandı)` : ""}`);
  console.log(`  Yeni kayıt: ${totalInserted.toLocaleString("tr-TR")}`);
  console.log(`  Güncellenen: ${totalUpdated.toLocaleString("tr-TR")}`);
  console.log(`  Toplam: ${(totalInserted + totalUpdated).toLocaleString("tr-TR")}`);
  if (totalErrors > 0) {
    console.log(`  Hatalar: ${totalErrors}`);
  }

  // Log final summary
  const dbCount = await prisma.tender.count({ where: { source: "EKAP" } });
  console.log(`\n  DB'deki toplam EKAP ihalesi: ${dbCount.toLocaleString("tr-TR")}`);
  console.log("═".repeat(60) + "\n");
}

// ─── CLI Argument Parsing ───────────────────────────────────

function parseArgs(): { fromYear: number; toYear: number; resume: boolean } {
  const args = process.argv.slice(2);
  let fromYear = 2021;
  let toYear = new Date().getFullYear();
  let resume = false;

  for (const arg of args) {
    if (arg.startsWith("--from=")) {
      fromYear = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--to=")) {
      toYear = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--resume") {
      resume = true;
    }
  }

  return { fromYear, toYear, resume };
}

// ─── Entry Point ────────────────────────────────────────────

const options = parseArgs();

// Pre-flight checks
async function preflight(): Promise<boolean> {
  console.log("\n  Ön kontroller yapılıyor...");

  // 1. Database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("  ✓ PostgreSQL bağlantısı başarılı");
  } catch {
    console.error("  ✗ PostgreSQL'e bağlanılamadı. DATABASE_URL kontrol edin.");
    console.error(`    DATABASE_URL: ${url ? url.replace(/:[^@]+@/, ":***@") : "(boş)"}`);
    return false;
  }

  // 2. EKAP API connectivity
  try {
    const res = await fetch(`${EKAP_BASE_URL}/b_ihalearama/api/Ihale/GetListByParameters`, {
      method: "POST",
      headers: EKAP_HEADERS,
      body: JSON.stringify({ searchText: "test", sayfaNo: 1, sayfaBoyutu: 1 }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      console.log("  ✓ EKAP API erişimi başarılı");
    } else {
      console.error(`  ✗ EKAP API yanıt verdi ama hata döndü: ${res.status}`);
      return false;
    }
  } catch {
    console.error("  ✗ EKAP API'ye erişilemiyor. İnternet bağlantısını kontrol edin.");
    console.error(`    EKAP_BASE_URL: ${EKAP_BASE_URL}`);
    return false;
  }

  console.log("");
  return true;
}

preflight()
  .then(async (ok) => {
    if (!ok) {
      console.error("\n  Ön kontroller başarısız — çıkılıyor.\n");
      process.exit(1);
    }
    return runInitialSync(options);
  })
  .catch((e) => {
    console.error("Fatal error:", e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
