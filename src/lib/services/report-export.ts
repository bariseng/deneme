// ─── Report Export Service ───────────────────────────────────
// PDF (@react-pdf/renderer) and Excel (SheetJS) export

import * as XLSX from "xlsx";

// ─── Types ──────────────────────────────────────────────────

export interface ReportRow {
  [key: string]: string | number | boolean | null;
}

export interface ReportConfig {
  title: string;
  subtitle?: string;
  columns: { key: string; label: string; width?: number }[];
  rows: ReportRow[];
  generatedAt?: Date;
}

// ─── Excel Export (SheetJS) ─────────────────────────────────

export function generateExcel(config: ReportConfig): Buffer {
  const workbook = XLSX.utils.book_new();

  // Build header row
  const headers = config.columns.map((c) => c.label);
  const dataRows = config.rows.map((row) =>
    config.columns.map((col) => {
      const val = row[col.key];
      if (val === null || val === undefined) return "";
      if (typeof val === "number") return val;
      return String(val);
    }),
  );

  const wsData = [headers, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  worksheet["!cols"] = config.columns.map((c) => ({
    wch: c.width || Math.max(c.label.length + 2, 15),
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, config.title.substring(0, 31));

  // Add metadata sheet
  const metaSheet = XLSX.utils.aoa_to_sheet([
    ["Rapor", config.title],
    ["Alt Başlık", config.subtitle || ""],
    ["Oluşturma Tarihi", (config.generatedAt || new Date()).toLocaleString("tr-TR")],
    ["Satır Sayısı", config.rows.length],
  ]);
  XLSX.utils.book_append_sheet(workbook, metaSheet, "Bilgi");

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

// ─── PDF HTML Template (for client-side rendering) ──────────

export function generatePdfHtml(config: ReportConfig): string {
  const date = (config.generatedAt || new Date()).toLocaleString("tr-TR");

  const headerCells = config.columns
    .map((c) => `<th style="padding:8px 12px;background:#1e3a5f;color:#fff;text-align:left;font-size:11px;">${c.label}</th>`)
    .join("");

  const bodyRows = config.rows
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? "#fff" : "#f8f9fa";
      const cells = config.columns
        .map((col) => {
          const val = row[col.key];
          const display = val === null || val === undefined
            ? "-"
            : typeof val === "number"
              ? val.toLocaleString("tr-TR")
              : String(val);
          return `<td style="padding:6px 12px;font-size:10px;border-bottom:1px solid #e9ecef;">${display}</td>`;
        })
        .join("");
      return `<tr style="background:${bg}">${cells}</tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><title>${config.title}</title></head>
<body style="font-family:Arial,sans-serif;margin:0;padding:20px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#1e3a5f;font-size:20px;margin:0;">İhalePro</h1>
    <h2 style="color:#333;font-size:16px;margin:4px 0;">${config.title}</h2>
    ${config.subtitle ? `<p style="color:#666;font-size:12px;margin:2px 0;">${config.subtitle}</p>` : ""}
    <p style="color:#999;font-size:10px;">${date}</p>
  </div>
  <table style="width:100%;border-collapse:collapse;border:1px solid #dee2e6;">
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div style="margin-top:16px;text-align:center;color:#999;font-size:9px;">
    İhalePro © ${new Date().getFullYear()} — Toplam ${config.rows.length} kayıt
  </div>
</body>
</html>`;
}

// ─── Dashboard Report Config Builders ───────────────────────

export function buildKpiReport(kpis: Record<string, unknown>): ReportConfig {
  return {
    title: "Dashboard KPI Raporu",
    subtitle: "Güncel performans göstergeleri",
    columns: [
      { key: "metric", label: "Metrik", width: 30 },
      { key: "value", label: "Değer", width: 20 },
    ],
    rows: Object.entries(kpis).map(([key, value]) => ({
      metric: KPI_LABELS[key] || key,
      value: typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : value as string | number,
    })),
    generatedAt: new Date(),
  };
}

const KPI_LABELS: Record<string, string> = {
  activeTenders: "Aktif İhale Sayısı",
  bidsSubmitted: "Teklif Verilen İhale",
  winRate: "Kazanma Oranı (%)",
  totalContractValue: "Toplam Sözleşme Değeri (TL)",
  upcomingDeadlines: "Yaklaşan Deadline (7 gün)",
  legalChanges: "Mevzuat Değişikliği (30 gün)",
  marketTrend: "Pazar Trendi",
};

export function buildRevenueReport(
  monthly: { month: string; amount: number; txCount: number }[],
): ReportConfig {
  return {
    title: "Gelir Raporu",
    subtitle: "Aylık gelir dağılımı",
    columns: [
      { key: "month", label: "Ay", width: 12 },
      { key: "amount", label: "Gelir (TL)", width: 15 },
      { key: "txCount", label: "İşlem Sayısı", width: 15 },
    ],
    rows: monthly,
    generatedAt: new Date(),
  };
}

export function buildTenderReport(
  tenders: { title: string; institution: string; city: string; deadline: string; estimatedCost: number }[],
): ReportConfig {
  return {
    title: "İhale Listesi Raporu",
    subtitle: `Toplam ${tenders.length} ihale`,
    columns: [
      { key: "title", label: "İhale Başlığı", width: 40 },
      { key: "institution", label: "Kurum", width: 25 },
      { key: "city", label: "Şehir", width: 12 },
      { key: "deadline", label: "Son Tarih", width: 12 },
      { key: "estimatedCost", label: "Tahmini Bedel (TL)", width: 18 },
    ],
    rows: tenders,
    generatedAt: new Date(),
  };
}

export function buildUserActivityReport(
  users: { name: string; email: string; bidCount: number }[],
): ReportConfig {
  return {
    title: "Kullanıcı Aktivite Raporu",
    columns: [
      { key: "name", label: "İsim", width: 20 },
      { key: "email", label: "E-posta", width: 25 },
      { key: "bidCount", label: "Teklif Sayısı", width: 15 },
    ],
    rows: users,
    generatedAt: new Date(),
  };
}
