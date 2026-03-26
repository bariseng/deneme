#!/usr/bin/env ts-node
// ─── Mock → Real Data Migration Script ──────────────────────
// Usage:
//   npx ts-node scripts/migrate-to-real-data.ts --dry-run
//   npx ts-node scripts/migrate-to-real-data.ts --execute
//   npx ts-node scripts/migrate-to-real-data.ts --step=3 --dry-run
//   npx ts-node scripts/migrate-to-real-data.ts --rollback

import { execSync } from "child_process";

// ─── Args ───────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || !args.includes("--execute");
const rollback = args.includes("--rollback");
const stepArg = args.find((a) => a.startsWith("--step="));
const targetStep = stepArg ? parseInt(stepArg.split("=")[1]) : null;

console.log(`\n🔄 İhalePro Veri Migrasyon Aracı`);
console.log(`   Mod: ${dryRun ? "DRY-RUN (simülasyon)" : "EXECUTE (gerçek)"}`);
if (rollback) console.log(`   ⚠️  ROLLBACK modu aktif`);
if (targetStep) console.log(`   Hedef adım: ${targetStep}`);
console.log("");

// ─── Lazy imports ───────────────────────────────────────────

async function loadDeps() {
  // Dynamic imports to avoid module resolution issues in ts-node
  const prismaModule = await import("../src/lib/prisma");
  const monitorModule = await import("../src/lib/migration/monitor");
  const validatorsModule = await import("../src/lib/validators/tender-validator");
  const companyValidatorModule = await import("../src/lib/validators/company-validator");
  const featureFlagsModule = await import("../src/lib/feature-flags");

  return {
    prisma: prismaModule.prisma,
    MigrationMonitor: monitorModule.MigrationMonitor,
    validateTender: validatorsModule.validateTender,
    detectDuplicates: validatorsModule.detectDuplicates,
    validateCompany: companyValidatorModule.validateCompany,
    isFeatureEnabled: featureFlagsModule.isFeatureEnabled,
  };
}

// ─── Step 1: Backup Mock Data ───────────────────────────────

async function step1Backup(
  monitor: InstanceType<Awaited<ReturnType<typeof loadDeps>>["MigrationMonitor"]>,
) {
  monitor.startStep("1. Mock veri yedeği (pg_dump)");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    monitor.failStep("DATABASE_URL tanımlı değil");
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = `backups/ihalepro_backup_${timestamp}.sql`;

  if (dryRun) {
    console.log(`  [DRY-RUN] pg_dump → ${backupFile}`);
    monitor.completeStep({ backupFile, dryRun: true });
    return;
  }

  try {
    execSync(`mkdir -p backups`);
    execSync(`pg_dump "${dbUrl}" > ${backupFile}`, { stdio: "pipe" });
    monitor.completeStep({ backupFile, size: "calculated at runtime" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "pg_dump hatası";
    monitor.failStep(msg);
    console.log("  ⚠️  pg_dump başarısız — devam ediliyor (backup opsiyonel)");
  }
}

// ─── Step 2: Mark Mock Data ─────────────────────────────────

async function step2MarkMock(
  prisma: Awaited<ReturnType<typeof loadDeps>>["prisma"],
  monitor: InstanceType<Awaited<ReturnType<typeof loadDeps>>["MigrationMonitor"]>,
) {
  monitor.startStep("2. Mock veri işaretleme (source='MOCK')");

  // Count current data
  const tenderCount = await prisma.tender.count();
  const companyCount = await prisma.company.count();

  monitor.updateTenderMetrics("mock", tenderCount);
  monitor.updateCompanyMetrics("mock", companyCount);

  if (dryRun) {
    console.log(`  [DRY-RUN] ${tenderCount} ihale → source='MOCK'`);
    console.log(`  [DRY-RUN] ${companyCount} firma mock olarak işaretlenecek`);
    monitor.completeStep({ tenderCount, companyCount, dryRun: true });
    return;
  }

  // Mark tenders without ekapNo as MOCK
  const marked = await prisma.tender.updateMany({
    where: {
      OR: [
        { ekapNo: null },
        { ekapNo: "" },
        { source: "EKAP", ekapNo: { startsWith: "MOCK" } },
      ],
    },
    data: { source: "MOCK" },
  });

  monitor.completeStep({ markedTenders: marked.count, companyCount });
}

// ─── Step 3: Enable Feature Flags ───────────────────────────

async function step3FeatureFlags(
  monitor: InstanceType<Awaited<ReturnType<typeof loadDeps>>["MigrationMonitor"]>,
  isFeatureEnabled: Awaited<ReturnType<typeof loadDeps>>["isFeatureEnabled"],
) {
  monitor.startStep("3. Feature flag durumu kontrol");

  const flags = [
    { name: "USE_REAL_EKAP_DATA" as const, env: process.env.USE_REAL_EKAP_DATA },
    { name: "USE_REAL_TED_DATA" as const, env: process.env.USE_REAL_TED_DATA },
    { name: "USE_REAL_PRICE_INDEX" as const, env: process.env.USE_REAL_PRICE_INDEX },
    { name: "USE_REAL_PAYMENTS" as const, env: process.env.USE_REAL_PAYMENTS },
    { name: "USE_REAL_COMPANY_DATA" as const, env: process.env.USE_REAL_COMPANY_DATA },
    { name: "USE_REAL_LEGAL_DATA" as const, env: process.env.USE_REAL_LEGAL_DATA },
  ];

  const status: Record<string, boolean> = {};
  for (const flag of flags) {
    const enabled = isFeatureEnabled(flag.name);
    status[flag.name] = enabled;
    console.log(`  ${flag.name}: ${enabled ? "✅ AÇIK" : "❌ KAPALI"} (env=${flag.env || "tanımsız"})`);
  }

  monitor.completeStep({ flags: status });
}

// ─── Step 4: Initial Sync ───────────────────────────────────

async function step4InitialSync(
  prisma: Awaited<ReturnType<typeof loadDeps>>["prisma"],
  monitor: InstanceType<Awaited<ReturnType<typeof loadDeps>>["MigrationMonitor"]>,
) {
  monitor.startStep("4. İlk veri çekme (initial sync)");

  if (dryRun) {
    console.log("  [DRY-RUN] EKAP'tan ihale çekilecek");
    console.log("  [DRY-RUN] TED'den uluslararası ihale çekilecek");
    console.log("  [DRY-RUN] Fiyat endeksi güncellenecek");
    monitor.completeStep({ dryRun: true });
    return;
  }

  let ekapCount = 0;
  try {
    const { ekapProvider } = await import("../src/lib/providers/ekap-provider");
    const data = await ekapProvider.searchTenders({ sayfaBoyutu: 100 });
    if (data.list.length > 0) {
      const result = await ekapProvider.batchUpsert(data.list);
      ekapCount = result.inserted + result.updated;
    }
    console.log(`  EKAP: ${ekapCount} ihale senkronize edildi`);
  } catch (e) {
    console.log(`  EKAP: Sync hatası — ${e instanceof Error ? e.message : "bilinmeyen"}`);
  }

  const realTenderCount = await prisma.tender.count({ where: { source: { not: "MOCK" } } });
  monitor.updateTenderMetrics("real", realTenderCount);
  monitor.completeStep({ ekapCount, realTenderCount });
}

// ─── Step 5: Data Comparison ────────────────────────────────

async function step5Compare(
  prisma: Awaited<ReturnType<typeof loadDeps>>["prisma"],
  monitor: InstanceType<Awaited<ReturnType<typeof loadDeps>>["MigrationMonitor"]>,
  validateTender: Awaited<ReturnType<typeof loadDeps>>["validateTender"],
  detectDuplicates: Awaited<ReturnType<typeof loadDeps>>["detectDuplicates"],
) {
  monitor.startStep("5. Mock vs Gerçek veri karşılaştırma");

  const mockTenders = await prisma.tender.count({ where: { source: "MOCK" } });
  const realTenders = await prisma.tender.count({ where: { source: { not: "MOCK" } } });

  console.log(`  Mock ihale: ${mockTenders}`);
  console.log(`  Gerçek ihale: ${realTenders}`);

  // Validate real tenders
  const realSample = await prisma.tender.findMany({
    where: { source: { not: "MOCK" } },
    take: 100,
    select: { title: true, institution: true, city: true, deadline: true, estimatedCost: true, status: true, tenderType: true, source: true, ekapNo: true },
  });

  let validCount = 0;
  let invalidCount = 0;
  for (const t of realSample) {
    const result = validateTender(t);
    if (result.valid) validCount++;
    else invalidCount++;
  }

  // Duplicate detection
  const allTenders = await prisma.tender.findMany({
    select: { ekapNo: true, title: true, institution: true },
    take: 1000,
  });
  const duplicates = detectDuplicates(allTenders);

  monitor.updateTenderMetrics("duplicates", duplicates.length);

  console.log(`  Doğrulama: ${validCount} geçerli, ${invalidCount} hatalı`);
  console.log(`  Duplicate: ${duplicates.length} adet tespit`);

  monitor.completeStep({ mockTenders, realTenders, validCount, invalidCount, duplicates: duplicates.length });
}

// ─── Step 6: Soft Delete Mock Data ──────────────────────────

async function step6SoftDelete(
  prisma: Awaited<ReturnType<typeof loadDeps>>["prisma"],
  monitor: InstanceType<Awaited<ReturnType<typeof loadDeps>>["MigrationMonitor"]>,
) {
  monitor.startStep("6. Mock veri soft-delete (isFeatured=false)");

  const mockCount = await prisma.tender.count({ where: { source: "MOCK" } });

  if (dryRun) {
    console.log(`  [DRY-RUN] ${mockCount} mock ihale gizlenecek (source='MOCK', isFeatured=false)`);
    monitor.completeStep({ mockCount, dryRun: true });
    return;
  }

  // Soft delete: set isFeatured=false and keep source="MOCK"
  // This ensures mock data stays but doesn't appear in default queries
  const updated = await prisma.tender.updateMany({
    where: { source: "MOCK" },
    data: { isFeatured: false },
  });

  console.log(`  ${updated.count} mock ihale gizlendi`);
  monitor.completeStep({ softDeleted: updated.count });
}

// ─── Step 7: Update Seed Strategy ───────────────────────────

async function step7SeedStrategy(
  prisma: Awaited<ReturnType<typeof loadDeps>>["prisma"],
  monitor: InstanceType<Awaited<ReturnType<typeof loadDeps>>["MigrationMonitor"]>,
) {
  monitor.startStep("7. Seed stratejisi kontrol");

  const tenderCount = await prisma.tender.count({ where: { source: { not: "MOCK" } } });
  const companyCount = await prisma.company.count();

  if (tenderCount === 0) {
    console.log("  ⚠️  Gerçek ihale bulunamadı — seed hala gerekli");
    console.log("  Önerilen: USE_REAL_EKAP_DATA=true yapın ve sync çalıştırın");
  } else {
    console.log(`  ✅ ${tenderCount} gerçek ihale mevcut — seed opsiyonel`);
  }

  console.log(`  Firmalar: ${companyCount} (seed'den)`);
  console.log("  Strateji: count === 0 → provider.fetch() çağrılır");

  monitor.completeStep({ tenderCount, companyCount, seedNeeded: tenderCount === 0 });
}

// ─── Rollback ───────────────────────────────────────────────

async function runRollback(
  prisma: Awaited<ReturnType<typeof loadDeps>>["prisma"],
) {
  console.log("\n⏪ ROLLBACK başlatılıyor...\n");

  // Step 1: Re-enable mock data
  const restored = await prisma.tender.updateMany({
    where: { source: "MOCK" },
    data: { isFeatured: true },
  });
  console.log(`  ✅ ${restored.count} mock ihale geri yüklendi`);

  // Step 2: Feature flags should be set to false in .env
  console.log("  ⚠️  .env dosyasında feature flag'leri false yapın:");
  console.log("     USE_REAL_EKAP_DATA=false");
  console.log("     USE_REAL_TED_DATA=false");
  console.log("     USE_REAL_PRICE_INDEX=false");
  console.log("     USE_REAL_PAYMENTS=false");

  console.log("\n✅ Rollback tamamlandı — mock veriye dönüldü\n");
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  const deps = await loadDeps();
  const { prisma, MigrationMonitor, validateTender, detectDuplicates, isFeatureEnabled } = deps;

  if (rollback) {
    await runRollback(prisma);
    process.exit(0);
  }

  const monitor = new MigrationMonitor(dryRun);

  const steps = [
    () => step1Backup(monitor),
    () => step2MarkMock(prisma, monitor),
    () => step3FeatureFlags(monitor, isFeatureEnabled),
    () => step4InitialSync(prisma, monitor),
    () => step5Compare(prisma, monitor, validateTender, detectDuplicates),
    () => step6SoftDelete(prisma, monitor),
    () => step7SeedStrategy(prisma, monitor),
  ];

  for (let i = 0; i < steps.length; i++) {
    if (targetStep && i + 1 !== targetStep) continue;

    try {
      await steps[i]();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
      console.error(`\n❌ Adım ${i + 1} hatası: ${msg}`);
      monitor.failStep(msg);

      if (!dryRun) {
        console.log("\n⚠️  Hata oluştu. Rollback önerilir:");
        console.log("   npx ts-node scripts/migrate-to-real-data.ts --rollback\n");
        break;
      }
    }
  }

  const report = monitor.finalize();
  monitor.printReport();

  if (dryRun) {
    console.log("\n💡 Gerçek migrasyonu başlatmak için:");
    console.log("   npx ts-node scripts/migrate-to-real-data.ts --execute\n");
  }

  process.exit(report.summary.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Migration fatal error:", e);
  process.exit(1);
});
