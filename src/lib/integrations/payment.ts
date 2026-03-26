/**
 * Payment types & pricing plans (client-safe)
 * Server-only iyzico logic is in src/lib/services/payment.ts
 */

export type PlanId = "free" | "basic" | "pro" | "enterprise";

export interface PricingPlan {
  id: PlanId;
  name: string;
  price: number;
  yearlyPrice: number;
  features: string[];
  highlighted?: boolean;
  limit: {
    tenderViews: number;
    favorites: number;
    notifications: number;
    competitorTracking: number;
    bids: number;
    aiCredits: number;
    apiAccess: boolean;
    pdfExport: boolean;
    agenticAI: boolean;
    smartBidOptimization: boolean;
    weeklyBriefing: boolean;
    multiUser: number;
    prioritySupport: boolean;
    slaGuarantee: boolean;
  };
}

export interface CheckoutSession {
  id: string;
  planId: PlanId;
  billingPeriod: "monthly" | "yearly";
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  paymentUrl?: string;
  createdAt: string;
}

export interface PaymentWebhookEvent {
  type: "payment.success" | "payment.failed" | "subscription.cancelled" | "subscription.renewed";
  sessionId: string;
  planId: PlanId;
  userId: string;
  amount: number;
  timestamp: string;
}

export const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Ücretsiz",
    price: 0,
    yearlyPrice: 0,
    features: [
      "Günlük 10 ihale görüntüleme",
      "Temel arama & filtreleme",
      "3 favori ihale",
      "Günlük 5 in-app bildirim",
    ],
    limit: {
      tenderViews: 10,
      favorites: 3,
      notifications: 5,
      competitorTracking: 0,
      bids: 0,
      aiCredits: 0,
      apiAccess: false,
      pdfExport: false,
      agenticAI: false,
      smartBidOptimization: false,
      weeklyBriefing: false,
      multiUser: 0,
      prioritySupport: false,
      slaGuarantee: false,
    },
  },
  {
    id: "basic",
    name: "Başlangıç",
    price: 299,
    yearlyPrice: 2870,
    features: [
      "Sınırsız ihale görüntüleme",
      "Gelişmiş arama & filtreleme",
      "25 favori ihale",
      "E-posta + push bildirim",
      "Aylık 10 teklif hazırlama",
      "Aylık 20 AI kredisi",
    ],
    limit: {
      tenderViews: -1,
      favorites: 25,
      notifications: -1,
      competitorTracking: 3,
      bids: 10,
      aiCredits: 20,
      apiAccess: false,
      pdfExport: false,
      agenticAI: false,
      smartBidOptimization: false,
      weeklyBriefing: false,
      multiUser: 0,
      prioritySupport: false,
      slaGuarantee: false,
    },
  },
  {
    id: "pro",
    name: "Profesyonel",
    price: 799,
    yearlyPrice: 7670,
    highlighted: true,
    features: [
      "Başlangıç'taki her şey +",
      "Sınırsız favori & bildirim",
      "Rakip analizi (5 firma takibi)",
      "Aylık 50 teklif hazırlama",
      "Aylık 100 AI kredisi",
      "PDF export & raporlama",
      "Öncelikli müşteri desteği",
    ],
    limit: {
      tenderViews: -1,
      favorites: -1,
      notifications: -1,
      competitorTracking: 5,
      bids: 50,
      aiCredits: 100,
      apiAccess: false,
      pdfExport: true,
      agenticAI: false,
      smartBidOptimization: false,
      weeklyBriefing: false,
      multiUser: 0,
      prioritySupport: true,
      slaGuarantee: false,
    },
  },
  {
    id: "enterprise",
    name: "Kurumsal",
    price: 1999,
    yearlyPrice: 19190,
    features: [
      "Profesyonel'deki her şey +",
      "Sınırsız rakip takibi & AI kredisi",
      "Agentic AI \"İhale Avcısı\" modu",
      "Akıllı teklif optimizasyonu & fiyat tahmini",
      "Haftalık AI brifing raporu",
      "API erişimi (3. parti entegrasyon)",
      "Çoklu kullanıcı (5 koltuk dahil)",
      "SLA garantisi (%99.9 uptime)",
    ],
    limit: {
      tenderViews: -1,
      favorites: -1,
      notifications: -1,
      competitorTracking: -1,
      bids: -1,
      aiCredits: -1,
      apiAccess: true,
      pdfExport: true,
      agenticAI: true,
      smartBidOptimization: true,
      weeklyBriefing: true,
      multiUser: 5,
      prioritySupport: true,
      slaGuarantee: true,
    },
  },
];

export function getPlanById(id: PlanId): PricingPlan | undefined {
  return pricingPlans.find((p) => p.id === id);
}
