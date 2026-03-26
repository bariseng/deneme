// ─── Integration Health Check ────────────────────────────────
// Unified health status for all external systems

import { ekapProvider } from "@/lib/providers/ekap-provider";
import { kepHealthCheck } from "./kep-provider";

// ─── Types ──────────────────────────────────────────────────

export interface HealthStatus {
  system: string;
  ok: boolean;
  latencyMs: number;
  message?: string;
  checkedAt: string;
}

export type SystemName = "ekap" | "kep" | "esign" | "edevlet" | "database";

// ─── Individual Checks ──────────────────────────────────────

async function checkEkap(): Promise<HealthStatus> {
  const start = Date.now();
  try {
    const result = await ekapProvider.searchTenders({ sayfaBoyutu: 1 });
    return {
      system: "ekap",
      ok: result.list.length >= 0,
      latencyMs: Date.now() - start,
      checkedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      system: "ekap",
      ok: false,
      latencyMs: Date.now() - start,
      message: e instanceof Error ? e.message : "Bağlantı hatası",
      checkedAt: new Date().toISOString(),
    };
  }
}

async function checkKep(): Promise<HealthStatus> {
  const start = Date.now();
  try {
    const result = await kepHealthCheck();
    return {
      system: "kep",
      ok: result.ok,
      latencyMs: result.latencyMs,
      message: result.ok ? undefined : "KEP servisi yanıt vermiyor",
      checkedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      system: "kep",
      ok: false,
      latencyMs: Date.now() - start,
      message: e instanceof Error ? e.message : "Bağlantı hatası",
      checkedAt: new Date().toISOString(),
    };
  }
}

async function checkEsign(): Promise<HealthStatus> {
  const start = Date.now();
  // e-İmza is a local crypto operation — check if crypto module works
  try {
    const crypto = await import("crypto");
    const hash = crypto.createHash("sha256").update("test").digest("hex");
    return {
      system: "esign",
      ok: hash.length === 64,
      latencyMs: Date.now() - start,
      checkedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      system: "esign",
      ok: false,
      latencyMs: Date.now() - start,
      message: e instanceof Error ? e.message : "Crypto modülü hatası",
      checkedAt: new Date().toISOString(),
    };
  }
}

async function checkEdevlet(): Promise<HealthStatus> {
  const start = Date.now();
  // e-Devlet API is not public — check if our upload storage is accessible
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.cachedData.count({ where: { provider: "EDEVLET" } });
    return {
      system: "edevlet",
      ok: true,
      latencyMs: Date.now() - start,
      message: "PDF upload modu aktif (API entegrasyonu yok)",
      checkedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      system: "edevlet",
      ok: false,
      latencyMs: Date.now() - start,
      message: e instanceof Error ? e.message : "Veritabanı hatası",
      checkedAt: new Date().toISOString(),
    };
  }
}

async function checkDatabase(): Promise<HealthStatus> {
  const start = Date.now();
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    return {
      system: "database",
      ok: true,
      latencyMs: Date.now() - start,
      checkedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      system: "database",
      ok: false,
      latencyMs: Date.now() - start,
      message: e instanceof Error ? e.message : "Veritabanı bağlantı hatası",
      checkedAt: new Date().toISOString(),
    };
  }
}

// ─── Check by System Name ───────────────────────────────────

const checkers: Record<SystemName, () => Promise<HealthStatus>> = {
  ekap: checkEkap,
  kep: checkKep,
  esign: checkEsign,
  edevlet: checkEdevlet,
  database: checkDatabase,
};

export async function checkSystem(system: SystemName): Promise<HealthStatus> {
  const checker = checkers[system];
  if (!checker) {
    return {
      system,
      ok: false,
      latencyMs: 0,
      message: `Bilinmeyen sistem: ${system}`,
      checkedAt: new Date().toISOString(),
    };
  }
  return checker();
}

// ─── Check All Systems ──────────────────────────────────────

export async function checkAllSystems(): Promise<HealthStatus[]> {
  const results = await Promise.allSettled(
    Object.values(checkers).map((fn) => fn()),
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      system: Object.keys(checkers)[i],
      ok: false,
      latencyMs: 0,
      message: r.reason?.message || "Kontrol başarısız",
      checkedAt: new Date().toISOString(),
    };
  });
}

// ─── Dashboard Summary ──────────────────────────────────────

export async function getIntegrationDashboard(): Promise<{
  allHealthy: boolean;
  systems: HealthStatus[];
  unhealthyCount: number;
}> {
  const systems = await checkAllSystems();
  const unhealthyCount = systems.filter((s) => !s.ok).length;
  return {
    allHealthy: unhealthyCount === 0,
    systems,
    unhealthyCount,
  };
}
