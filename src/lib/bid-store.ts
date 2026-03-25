"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ── Types ─────────────────────────────────────── */

export interface CostLineItem {
  id: string;
  description: string;
  unit: string; // adet, m², m³, kg, ton, lt, km, gün, ay etc.
  quantity: number;
  unitPrice: number;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxOffice: string; // Vergi dairesi
  taxNumber: string; // Vergi no
  authorizedPerson: string; // Yetkili kişi
  title: string; // Unvan
}

export type BidStatus = "draft" | "completed" | "submitted";

export interface Bid {
  id: string;
  tenderId: string;
  tenderTitle: string;
  institution: string;
  ekapNo: string;
  status: BidStatus;
  costItems: CostLineItem[];
  letterContent: string;
  companyInfo: CompanyInfo;
  notes: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  submittedAt?: string; // ISO
}

/* ── Defaults ──────────────────────────────────── */

const defaultCompanyInfo: CompanyInfo = {
  name: "Örnek İnşaat A.Ş.",
  address: "Atatürk Bulvarı No:123, 06680 Çankaya/Ankara",
  phone: "0312 555 00 00",
  email: "info@ornekinsaat.com.tr",
  taxOffice: "Çankaya Vergi Dairesi",
  taxNumber: "1234567890",
  authorizedPerson: "Mehmet Yılmaz",
  title: "Genel Müdür",
};

const defaultUnits = [
  "adet",
  "m²",
  "m³",
  "kg",
  "ton",
  "lt",
  "km",
  "metre",
  "gün",
  "ay",
  "saat",
  "takım",
  "set",
  "paket",
] as const;

export { defaultUnits };

/* ── Helpers ───────────────────────────────────── */

function genBidId() {
  return `bid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function genLineId() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function calcLineTotal(item: CostLineItem): number {
  return item.quantity * item.unitPrice;
}

export function calcBidTotal(items: CostLineItem[]): number {
  return items.reduce((sum, item) => sum + calcLineTotal(item), 0);
}

export function generateBidLetter(
  bid: Pick<Bid, "tenderTitle" | "institution" | "ekapNo" | "companyInfo" | "costItems">
): string {
  const total = calcBidTotal(bid.costItems);
  const formatted = total.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  const today = new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${bid.companyInfo.name.toUpperCase()}
${bid.companyInfo.address}
Tel: ${bid.companyInfo.phone} | E-posta: ${bid.companyInfo.email}
Vergi Dairesi: ${bid.companyInfo.taxOffice} | Vergi No: ${bid.companyInfo.taxNumber}

Tarih: ${today}

Konu: Teklif Mektubu

Sayın ${bid.institution},

İlgi: ${bid.ekapNo} EKAP kayıt numaralı "${bid.tenderTitle}" ihalesi hakkında.

Yukarıda belirtilen ihaleye ilişkin teklifimizi aşağıda sunuyoruz:

TOPLAM TEKLİF BEDELİ: ${formatted} ₺ (KDV Hariç)

Teklifimiz, ihale şartnamesi ve eklerinde belirtilen tüm şartları kapsamaktadır.

Teklif geçerlilik süresi: İhale tarihinden itibaren 60 (altmış) takvim günüdür.

Saygılarımızla,

${bid.companyInfo.authorizedPerson}
${bid.companyInfo.title}
${bid.companyInfo.name}`;
}

/* ── Store Interface ───────────────────────────── */

interface BidStore {
  bids: Bid[];
  companyInfo: CompanyInfo;

  /* Company info */
  updateCompanyInfo: (info: Partial<CompanyInfo>) => void;

  /* CRUD */
  createBid: (params: {
    tenderId: string;
    tenderTitle: string;
    institution: string;
    ekapNo: string;
  }) => string; // returns bid id
  duplicateBid: (bidId: string, newTenderId?: string) => string | null;
  deleteBid: (bidId: string) => void;
  getBid: (bidId: string) => Bid | undefined;

  /* Cost items */
  addCostItem: (bidId: string) => void;
  updateCostItem: (
    bidId: string,
    lineId: string,
    updates: Partial<CostLineItem>
  ) => void;
  removeCostItem: (bidId: string, lineId: string) => void;

  /* Letter & notes */
  updateLetterContent: (bidId: string, content: string) => void;
  updateNotes: (bidId: string, notes: string) => void;
  regenerateLetter: (bidId: string) => void;

  /* Status */
  updateBidStatus: (bidId: string, status: BidStatus) => void;

  /* Auto-save marker */
  touchBid: (bidId: string) => void;
}

/* ── Seed data ─────────────────────────────────── */

const seedBids: Bid[] = [
  {
    id: "bid-seed-1",
    tenderId: "1",
    tenderTitle: "Ankara-Sivas YHT Hattı 2. Etap Yapım İşi",
    institution: "T.C. Ulaştırma ve Altyapı Bakanlığı",
    ekapNo: "2026/100234",
    status: "draft",
    costItems: [
      {
        id: "line-s1-1",
        description: "Demiryolu altyapı kazı işleri",
        unit: "m³",
        quantity: 150000,
        unitPrice: 85,
      },
      {
        id: "line-s1-2",
        description: "Beton döküm (C35/45)",
        unit: "m³",
        quantity: 45000,
        unitPrice: 1250,
      },
      {
        id: "line-s1-3",
        description: "Ray montajı (60E1)",
        unit: "metre",
        quantity: 360000,
        unitPrice: 320,
      },
      {
        id: "line-s1-4",
        description: "Tünel açma (TBM)",
        unit: "metre",
        quantity: 12000,
        unitPrice: 45000,
      },
      {
        id: "line-s1-5",
        description: "Viyadük yapımı",
        unit: "metre",
        quantity: 8500,
        unitPrice: 65000,
      },
    ],
    letterContent: "",
    companyInfo: defaultCompanyInfo,
    notes: "2. etap güzergah revizyonu dikkate alınmalı.",
    createdAt: "2026-03-22T10:00:00Z",
    updatedAt: "2026-03-24T14:30:00Z",
  },
  {
    id: "bid-seed-2",
    tenderId: "6",
    tenderTitle: "Karayolları Genel Müdürlüğü Asfalt Yapım İşi",
    institution: "Karayolları Genel Müdürlüğü",
    ekapNo: "2026/100239",
    status: "completed",
    costItems: [
      {
        id: "line-s2-1",
        description: "Asfalt serimi (BSK)",
        unit: "ton",
        quantity: 25000,
        unitPrice: 780,
      },
      {
        id: "line-s2-2",
        description: "Plent altı malzeme temini",
        unit: "ton",
        quantity: 30000,
        unitPrice: 145,
      },
      {
        id: "line-s2-3",
        description: "Yol çizgi işleri",
        unit: "km",
        quantity: 120,
        unitPrice: 8500,
      },
    ],
    letterContent: "",
    companyInfo: defaultCompanyInfo,
    notes: "",
    createdAt: "2026-03-18T08:00:00Z",
    updatedAt: "2026-03-20T16:45:00Z",
    submittedAt: "2026-03-20T16:45:00Z",
  },
];

// Generate letters for seeds
seedBids.forEach((b) => {
  if (!b.letterContent) {
    b.letterContent = generateBidLetter(b);
  }
});

/* ── Store ─────────────────────────────────────── */

export const useBidStore = create<BidStore>()(
  persist(
    (set, get) => ({
      bids: seedBids,
      companyInfo: defaultCompanyInfo,

      updateCompanyInfo: (info) =>
        set((state) => ({
          companyInfo: { ...state.companyInfo, ...info },
        })),

      createBid: ({ tenderId, tenderTitle, institution, ekapNo }) => {
        const id = genBidId();
        const now = new Date().toISOString();
        const bid: Bid = {
          id,
          tenderId,
          tenderTitle,
          institution,
          ekapNo,
          status: "draft",
          costItems: [],
          letterContent: "",
          companyInfo: get().companyInfo,
          notes: "",
          createdAt: now,
          updatedAt: now,
        };
        bid.letterContent = generateBidLetter(bid);
        set((state) => ({ bids: [bid, ...state.bids] }));
        return id;
      },

      duplicateBid: (bidId, newTenderId) => {
        const source = get().bids.find((b) => b.id === bidId);
        if (!source) return null;
        const id = genBidId();
        const now = new Date().toISOString();
        const newBid: Bid = {
          ...source,
          id,
          tenderId: newTenderId || source.tenderId,
          status: "draft",
          costItems: source.costItems.map((item) => ({
            ...item,
            id: genLineId(),
          })),
          createdAt: now,
          updatedAt: now,
          submittedAt: undefined,
        };
        set((state) => ({ bids: [newBid, ...state.bids] }));
        return id;
      },

      deleteBid: (bidId) =>
        set((state) => ({
          bids: state.bids.filter((b) => b.id !== bidId),
        })),

      getBid: (bidId) => get().bids.find((b) => b.id === bidId),

      addCostItem: (bidId) =>
        set((state) => ({
          bids: state.bids.map((b) =>
            b.id === bidId
              ? {
                  ...b,
                  costItems: [
                    ...b.costItems,
                    {
                      id: genLineId(),
                      description: "",
                      unit: "adet",
                      quantity: 0,
                      unitPrice: 0,
                    },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : b
          ),
        })),

      updateCostItem: (bidId, lineId, updates) =>
        set((state) => ({
          bids: state.bids.map((b) =>
            b.id === bidId
              ? {
                  ...b,
                  costItems: b.costItems.map((item) =>
                    item.id === lineId ? { ...item, ...updates } : item
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : b
          ),
        })),

      removeCostItem: (bidId, lineId) =>
        set((state) => ({
          bids: state.bids.map((b) =>
            b.id === bidId
              ? {
                  ...b,
                  costItems: b.costItems.filter((item) => item.id !== lineId),
                  updatedAt: new Date().toISOString(),
                }
              : b
          ),
        })),

      updateLetterContent: (bidId, content) =>
        set((state) => ({
          bids: state.bids.map((b) =>
            b.id === bidId
              ? { ...b, letterContent: content, updatedAt: new Date().toISOString() }
              : b
          ),
        })),

      updateNotes: (bidId, notes) =>
        set((state) => ({
          bids: state.bids.map((b) =>
            b.id === bidId
              ? { ...b, notes, updatedAt: new Date().toISOString() }
              : b
          ),
        })),

      regenerateLetter: (bidId) =>
        set((state) => ({
          bids: state.bids.map((b) =>
            b.id === bidId
              ? {
                  ...b,
                  letterContent: generateBidLetter(b),
                  updatedAt: new Date().toISOString(),
                }
              : b
          ),
        })),

      updateBidStatus: (bidId, status) =>
        set((state) => ({
          bids: state.bids.map((b) =>
            b.id === bidId
              ? {
                  ...b,
                  status,
                  updatedAt: new Date().toISOString(),
                  submittedAt:
                    status === "submitted"
                      ? new Date().toISOString()
                      : b.submittedAt,
                }
              : b
          ),
        })),

      touchBid: (bidId) =>
        set((state) => ({
          bids: state.bids.map((b) =>
            b.id === bidId
              ? { ...b, updatedAt: new Date().toISOString() }
              : b
          ),
        })),
    }),
    {
      name: "ihalepro-bid-store",
    }
  )
);
