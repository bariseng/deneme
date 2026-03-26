#!/usr/bin/env ts-node
// ─── Production Readiness Check Script ──────────────────────
// Run: npx ts-node scripts/production-check.ts

async function main() {
  console.log("\n🔍 İhalePro Production Readiness Check\n");

  // ENV check
  const { printEnvCheck } = await import("../src/lib/production/env-check");
  printEnvCheck();

  // Production checklist
  const { runProductionChecklist, printChecklist } = await import("../src/lib/production/checklist");
  const result = await runProductionChecklist();
  printChecklist(result);

  process.exit(result.ready ? 0 : 1);
}

main().catch((e) => {
  console.error("Check failed:", e);
  process.exit(1);
});
