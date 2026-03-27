// ─── Client-side API helpers — replaces data.ts mock imports ───

import { formatCurrency } from "./format";
import type { Tender } from "./data";

// ─── Enum Mappings ────────────────────────────────────────────

const TENDER_TYPE_LABELS: Record<string, string> = {
  YAPIM: "Yapım İşleri",
  MAL_ALIMI: "Mal Alımı",
  HIZMET: "Hizmet Alımı",
  DANISMANLIK: "Danışmanlık",
};

const STATUS_MAP: Record<string, Tender["status"]> = {
  BASVURU_ACIK: "active",
  YAKLASAN: "upcoming",
  DEGERLENDIRME: "closed",
  SONUCLANDI: "closed",
  IPTAL: "closed",
};

const CATEGORY_FROM_TYPE: Record<string, string> = {
  YAPIM: "Yapım İşleri",
  MAL_ALIMI: "Mal Alımı",
  HIZMET: "Hizmet Alımı",
  DANISMANLIK: "Danışmanlık",
};

// ─── API Response Types ───────────────────────────────────────

export interface ApiTender {
  id: string;
  title: string;
  institution: string;
  city: string;
  tenderType: string;
  status: string;
  ekapNo?: string | null;
  description?: string | null;
  estimatedCost?: string | number | null;
  publishDate: string;
  deadline: string;
  source?: string;
  latitude?: number | null;
  longitude?: number | null;
  documents?: Array<{
    id: string;
    name: string;
    category?: string;
    fileSize?: number;
  }>;
  _count?: { favorites?: number; applications?: number };
}

export interface ApiPagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
}

export interface TendersResponse {
  success: boolean;
  data: ApiTender[];
  pagination: ApiPagination;
}

// ─── Adapter: API → Frontend Tender ───────────────────────────

export function mapApiTender(t: ApiTender): Tender {
  const costNum =
    typeof t.estimatedCost === "string"
      ? parseFloat(t.estimatedCost)
      : (t.estimatedCost ?? 0);
  const costValue = costNum || 0;

  const publishDate =
    typeof t.publishDate === "string"
      ? t.publishDate.split("T")[0]
      : new Date(t.publishDate).toISOString().split("T")[0];

  const deadline =
    typeof t.deadline === "string"
      ? t.deadline.split("T")[0]
      : new Date(t.deadline).toISOString().split("T")[0];

  return {
    id: t.id,
    title: t.title,
    institution: t.institution,
    institutionType: "diger",
    city: t.city || "Bilinmiyor",
    category: CATEGORY_FROM_TYPE[t.tenderType] ?? t.tenderType ?? "Genel",
    type: TENDER_TYPE_LABELS[t.tenderType] ?? "Açık İhale",
    estimatedCost: costValue > 0 ? formatCurrency(costValue) : "Belirtilmemiş",
    estimatedCostValue: costValue,
    publishDate,
    deadline,
    status: STATUS_MAP[t.status] ?? "active",
    ekapNo: t.ekapNo ?? "",
    description: t.description ?? "",
    documents: (t.documents ?? []).map((d) => ({
      name: d.name,
      size: d.fileSize ? `${(d.fileSize / 1024 / 1024).toFixed(1)} MB` : "—",
      category: (d.category as "sartname" | "teknik" | "sozlesme" | "diger") ?? "diger",
    })),
    timeline: [],
    coordinates:
      t.latitude && t.longitude
        ? { lat: t.latitude, lng: t.longitude }
        : undefined,
  };
}

// ─── Fetch Helpers ────────────────────────────────────────────

const BASE = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

export interface FetchTendersParams {
  q?: string;
  city?: string;
  type?: string;
  status?: string;
  budgetMin?: number;
  budgetMax?: number;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export async function fetchTenders(
  params: FetchTendersParams = {},
): Promise<{ tenders: Tender[]; pagination: ApiPagination }> {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }

  const res = await fetch(`${BASE}/api/tenders?${sp}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) return { tenders: [], pagination: { total: 0, page: 1, limit: 20, pages: 0, hasNext: false } };

  const json = (await res.json()) as TendersResponse;
  return {
    tenders: (json.data ?? []).map(mapApiTender),
    pagination: json.pagination ?? { total: 0, page: 1, limit: 20, pages: 0, hasNext: false },
  };
}

export async function fetchTenderById(id: string): Promise<Tender | null> {
  const res = await fetch(`${BASE}/api/tenders?q=${id}&limit=1`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) return null;

  const json = (await res.json()) as TendersResponse;
  const match = json.data?.find((t) => t.id === id);
  return match ? mapApiTender(match) : null;
}

export async function fetchDashboard(
  section?: string,
): Promise<Record<string, unknown>> {
  const sp = section ? `?section=${section}` : "";
  const res = await fetch(`${BASE}/api/dashboard${sp}`, {
    next: { revalidate: 120 },
  });

  if (!res.ok) return {};
  const json = await res.json();
  return json.data ?? json;
}

export async function fetchStats(
  type: "cities" | "sectors" | "daily",
): Promise<unknown[]> {
  const res = await fetch(`${BASE}/api/stats/${type}`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}
