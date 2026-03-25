/**
 * Payment Service (iyzico / Stripe)
 *
 * In production, this would integrate with iyzico (Turkish market) or Stripe.
 *
 * Required env vars:
 *   IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL
 *   or STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */

export type PlanId = "free" | "pro" | "enterprise";

export interface PricingPlan {
  id: PlanId;
  name: string;
  price: number; // Monthly in TRY
  yearlyPrice: number; // Yearly in TRY
  features: string[];
  highlighted?: boolean;
  limit: {
    tenderViews: number; // -1 = unlimited
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
    multiUser: number; // seats, 0 = single
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
    id: "pro",
    name: "Profesyonel",
    price: 499,
    yearlyPrice: 4790,
    highlighted: true,
    features: [
      "Sınırsız ihale görüntüleme & arama",
      "Sınırsız favori & bildirim (e-posta + push)",
      "Rakip analizi (5 firma takibi)",
      "Teklif hazırlama araçları (aylık 20 teklif)",
      "PDF export",
      "Ayda 50 AI kredisi (chatbot + özet + tahmin)",
      "Öncelikli müşteri desteği",
    ],
    limit: {
      tenderViews: -1,
      favorites: -1,
      notifications: -1,
      competitorTracking: 5,
      bids: 20,
      aiCredits: 50,
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
      "Çoklu kullanıcı (5 koltuk dahil, +₺199/koltuk)",
      "Özel eğitim & onboarding",
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

class PaymentService {
  async createCheckout(
    planId: PlanId,
    billingPeriod: "monthly" | "yearly",
    userId: string
  ): Promise<CheckoutSession> {
    const plan = pricingPlans.find((p) => p.id === planId);
    if (!plan) throw new Error("Geçersiz plan");
    if (plan.id === "free") throw new Error("Ücretsiz plan için ödeme gerekmez");

    const amount = billingPeriod === "yearly" ? plan.yearlyPrice : plan.price;

    // In production: iyzico or Stripe checkout session creation
    const session: CheckoutSession = {
      id: `cs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      planId,
      billingPeriod,
      amount,
      currency: "TRY",
      status: "pending",
      paymentUrl: `#odeme-demo-${planId}`,
      createdAt: new Date().toISOString(),
    };

    return session;
  }

  async handleWebhook(event: PaymentWebhookEvent): Promise<void> {
    switch (event.type) {
      case "payment.success":
        // Activate subscription — handled by webhook route
        break;
      case "payment.failed":
        break;
      case "subscription.cancelled":
        break;
      case "subscription.renewed":
        break;
    }
  }

  async cancelSubscription(_userId: string): Promise<{ success: boolean }> {
    return { success: true };
  }
}

export const paymentService = new PaymentService();
