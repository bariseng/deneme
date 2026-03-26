// ─── Migration Monitoring ───────────────────────────────────
// Tracks sync success rate, data consistency, UX metrics during migration

// ─── Types ──────────────────────────────────────────────────

export interface MigrationStep {
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  details?: Record<string, unknown>;
  error?: string;
}

export interface MigrationReport {
  runId: string;
  dryRun: boolean;
  startedAt: Date;
  completedAt?: Date;
  steps: MigrationStep[];
  summary: {
    totalSteps: number;
    completed: number;
    failed: number;
    skipped: number;
  };
  dataMetrics: DataMetrics;
}

interface DataMetrics {
  tenders: { mock: number; real: number; duplicates: number };
  companies: { mock: number; real: number; validationErrors: number };
  priceIndices: { mock: number; real: number; anomalies: number };
  syncSuccessRate: number;
}

// ─── Migration Monitor ──────────────────────────────────────

export class MigrationMonitor {
  private report: MigrationReport;
  private currentStep: MigrationStep | null = null;

  constructor(dryRun: boolean) {
    this.report = {
      runId: `mig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      dryRun,
      startedAt: new Date(),
      steps: [],
      summary: { totalSteps: 0, completed: 0, failed: 0, skipped: 0 },
      dataMetrics: {
        tenders: { mock: 0, real: 0, duplicates: 0 },
        companies: { mock: 0, real: 0, validationErrors: 0 },
        priceIndices: { mock: 0, real: 0, anomalies: 0 },
        syncSuccessRate: 0,
      },
    };
  }

  startStep(name: string): void {
    this.currentStep = {
      name,
      status: "running",
      startedAt: new Date(),
    };
    this.report.steps.push(this.currentStep);
    this.report.summary.totalSteps++;
    console.log(`\n[STEP] ${name} başlatılıyor...`);
  }

  completeStep(details?: Record<string, unknown>): void {
    if (!this.currentStep) return;
    this.currentStep.status = "completed";
    this.currentStep.completedAt = new Date();
    this.currentStep.durationMs = this.currentStep.startedAt
      ? this.currentStep.completedAt.getTime() - this.currentStep.startedAt.getTime()
      : 0;
    this.currentStep.details = details;
    this.report.summary.completed++;
    console.log(`[OK] ${this.currentStep.name} tamamlandı (${this.currentStep.durationMs}ms)`);
  }

  failStep(error: string): void {
    if (!this.currentStep) return;
    this.currentStep.status = "failed";
    this.currentStep.completedAt = new Date();
    this.currentStep.durationMs = this.currentStep.startedAt
      ? this.currentStep.completedAt.getTime() - this.currentStep.startedAt.getTime()
      : 0;
    this.currentStep.error = error;
    this.report.summary.failed++;
    console.error(`[FAIL] ${this.currentStep.name}: ${error}`);
  }

  skipStep(reason: string): void {
    if (!this.currentStep) return;
    this.currentStep.status = "skipped";
    this.currentStep.details = { reason };
    this.report.summary.skipped++;
    console.log(`[SKIP] ${this.currentStep.name}: ${reason}`);
  }

  updateDataMetrics(metrics: Partial<DataMetrics>): void {
    Object.assign(this.report.dataMetrics, metrics);
  }

  updateTenderMetrics(key: keyof DataMetrics["tenders"], value: number): void {
    this.report.dataMetrics.tenders[key] = value;
  }

  updateCompanyMetrics(key: keyof DataMetrics["companies"], value: number): void {
    this.report.dataMetrics.companies[key] = value;
  }

  updatePriceMetrics(key: keyof DataMetrics["priceIndices"], value: number): void {
    this.report.dataMetrics.priceIndices[key] = value;
  }

  finalize(): MigrationReport {
    this.report.completedAt = new Date();

    // Calculate sync success rate
    const { completed, totalSteps } = this.report.summary;
    this.report.dataMetrics.syncSuccessRate =
      totalSteps > 0 ? Math.round((completed / totalSteps) * 100) : 0;

    return this.report;
  }

  getReport(): MigrationReport {
    return this.report;
  }

  printReport(): void {
    const r = this.report;
    console.log("\n" + "═".repeat(60));
    console.log(`MİGRASYON RAPORU (${r.dryRun ? "DRY-RUN" : "GERÇEK"})`);
    console.log("═".repeat(60));
    console.log(`Run ID: ${r.runId}`);
    console.log(`Başlangıç: ${r.startedAt.toISOString()}`);
    if (r.completedAt) {
      console.log(`Bitiş: ${r.completedAt.toISOString()}`);
      console.log(`Süre: ${r.completedAt.getTime() - r.startedAt.getTime()}ms`);
    }
    console.log(`\nAdımlar: ${r.summary.completed}/${r.summary.totalSteps} başarılı, ${r.summary.failed} hatalı, ${r.summary.skipped} atlandı`);
    console.log(`\nVeri Metrikleri:`);
    console.log(`  İhale: ${r.dataMetrics.tenders.real} gerçek, ${r.dataMetrics.tenders.mock} mock, ${r.dataMetrics.tenders.duplicates} duplicate`);
    console.log(`  Firma: ${r.dataMetrics.companies.real} gerçek, ${r.dataMetrics.companies.mock} mock`);
    console.log(`  Fiyat: ${r.dataMetrics.priceIndices.real} gerçek, ${r.dataMetrics.priceIndices.mock} mock`);
    console.log(`  Sync Başarı: %${r.dataMetrics.syncSuccessRate}`);
    console.log("═".repeat(60));
  }
}
