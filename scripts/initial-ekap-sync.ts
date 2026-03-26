#!/usr/bin/env npx tsx
// ─── Initial EKAP Sync — 5 Year Backfill ────────────────────
// Fetches ALL tenders from 2021-2026, month by month
// Checkpoints to DataSyncLog so interrupted runs can resume
// Run: npx tsx scripts/initial-ekap-sync.ts [--from=2021] [--to=2026] [--resume]

// @ts-expect-error — script runs from project root with tsx, path resolves at runtime
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

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
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

const TENDER_TYPE_MAP: Record<string, string> = {
  Yapım: "YAPIM",
  "Mal Alımı": "MAL_ALIMI",
  "Hizmet Alımı": "HIZMET",
  "Danışmanlık Hizmet Alımı": "DANISMANLIK",
};

const STATUS_MAP: Record<number, string> = {
  1: "BASVURU_ACIK",
  2: "DEGERLENDIRME",
  3: "SONUCLANDI",
  4: "IPTAL",
  5: "YAKLASAN",
};

// ─── Types ──────────────────────────────────────────────────

interface EkapTenderRaw {
  ihaleId: number;
  ihaleAdi: string;
  iknYili: number;
  iknSayi: number;
  idareAdi: string;
  il: string;
  ilce?: string;
  ihaleTarihi: string;
  yaklesikMaliyet?: number;
  ihaleTuru?: string;
  ihaleDurumu?: string;
  ihaleDurumId?: number;
  eIhale?: boolean;
  yabanciIsteklilereIzinVeriliyorMu?: boolean;
  kismiTeklifMi?: boolean;
  ortakAlimMi?: boolean;
  ilanTuru?: string;
  ilanTarihi?: string;
  okasKodlar?: string[];
  aciklama?: string;
  teminatOrani?: number;
  iletisimAdi?: string;
  iletisimTelefon?: string;
  iletisimEposta?: string;
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
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
  return { start, end };
}

function mapTenderType(ekapType?: string): string {
  if (!ekapType) return "HIZMET";
  return TENDER_TYPE_MAP[ekapType] ?? "HIZMET";
}

function mapStatus(durumId?: number): string {
  if (!durumId) return "BASVURU_ACIK";
  return STATUS_MAP[durumId] ?? "BASVURU_ACIK";
}

// ─── EKAP API Call ──────────────────────────────────────────

async function fetchEkapPage(
  dateStart: string,
  dateEnd: string,
  page: number,
): Promise<EkapListResponse> {
  const body = {
    searchText: "",
    iknYili: null,
    iknSayi: null,
    ihaleTarihBaslangic: dateStart,
    ihaleTarihBitis: dateEnd,
    ihaleDurumIdList: [],
    ihaleTuruIdList: [],
    ihaleUsulIdList: [],
    ilIdList: [],
    okasKodList: [],
    kurumIdList: [],
    eIhale: null,
    ortakAlimMi: null,
    kismiTeklifMi: null,
    yabanciIsteklilereIzinVeriliyorMu: null,
    sayfaNo: page,
    sayfaBoyutu: PAGE_SIZE,
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

  const ekapNos = tenders.map((t) => `${t.iknYili}/${t.iknSayi}`);
  const existing = await prisma.tender.findMany({
    where: { ekapNo: { in: ekapNos } },
    select: { ekapNo: true },
  });
  const existingSet = new Set(existing.map((e: { ekapNo: string | null }) => e.ekapNo));

  for (const raw of tenders) {
    try {
      const ekapNo = `${raw.iknYili}/${raw.iknSayi}`;
      const data = {
        ekapNo,
        title: raw.ihaleAdi,
        institution: raw.idareAdi,
        city: raw.il,
        district: raw.ilce ?? null,
        tenderType: mapTenderType(raw.ihaleTuru) as "YAPIM" | "MAL_ALIMI" | "HIZMET" | "DANISMANLIK",
        status: mapStatus(raw.ihaleDurumId) as "BASVURU_ACIK" | "DEGERLENDIRME" | "SONUCLANDI" | "IPTAL" | "YAKLASAN",
        deadline: new Date(raw.ihaleTarihi),
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
runInitialSync(options)
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
