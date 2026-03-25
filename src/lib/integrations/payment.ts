/**
 * Payment Service (iyzico / Stripe)
 *
 * In production, this would integrate with iyzico (Turkish market) or Stripe.
 *
 * Required env vars:
 *   IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL
 *   or STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */

export type PlanId = "free" | "starter" | "pro" | "enterprise";

export interface PricingPlan {
  id: PlanId;
  name: string;
  price: number; // Monthly in TRY
  yearlyPrice: number; // Yearly in TRY
  features: string[];
  highlighted?: boolean;
  limit: {
    tenderAlerts: number; // -1 = unlimited
    savedSearches: number;
    competitorTracking: number;
    bidTemplates: number;
    apiAccess: boolean;
    exportCSV: boolean;
    aiFeatures: boolean;
    prioritySupport: boolean;
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
      "Günde 10 ihale bildirimi",
      "3 kayıtlı arama",
      "Temel ihale listeleme",
      "Manuel ihale takibi",
    ],
    limit: {
      tenderAlerts: 10,
      savedSearches: 3,
      competitorTracking: 0,
      bidTemplates: 1,
      apiAccess: false,
      exportCSV: false,
      aiFeatures: false,
      prioritySupport: false,
    },
  },
  {
    id: "starter",
    name: "Başlangıç",
    price: 299,
    yearlyPrice: 2990,
    features: [
      "Günde 50 ihale bildirimi",
      "10 kayıtlı arama",
      "Rakip takibi (5 firma)",
      "5 teklif şablonu",
      "CSV dışa aktarma",
      "E-posta bildirimleri",
    ],
    limit: {
      tenderAlerts: 50,
      savedSearches: 10,
      competitorTracking: 5,
      bidTemplates: 5,
      apiAccess: false,
      exportCSV: true,
      aiFeatures: false,
      prioritySupport: false,
    },
  },
  {
    id: "pro",
    name: "Profesyonel",
    price: 699,
    yearlyPrice: 6990,
    highlighted: true,
    features: [
      "Sınırsız ihale bildirimi",
      "Sınırsız kayıtlı arama",
      "Rakip takibi (20 firma)",
      "Sınırsız teklif şablonu",
      "AI özellikleri (tam erişim)",
      "Öncelikli destek",
      "API erişimi",
      "Gelişmiş raporlama",
    ],
    limit: {
      tenderAlerts: -1,
      savedSearches: -1,
      competitorTracking: 20,
      bidTemplates: -1,
      apiAccess: true,
      exportCSV: true,
      aiFeatures: true,
      prioritySupport: true,
    },
  },
  {
    id: "enterprise",
    name: "Kurumsal",
    price: 1499,
    yearlyPrice: 14990,
    features: [
      "Profesyonel'deki her şey",
      "Sınırsız rakip takibi",
      "Özel API entegrasyonu",
      "Çoklu kullanıcı desteği",
      "Özel eğitim ve danışmanlık",
      "SLA garantisi (%99.9)",
      "Beyaz etiket seçeneği",
      "Özel raporlama",
    ],
    limit: {
      tenderAlerts: -1,
      savedSearches: -1,
      competitorTracking: -1,
      bidTemplates: -1,
      apiAccess: true,
      exportCSV: true,
      aiFeatures: true,
      prioritySupport: true,
    },
  },
];

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

    console.log(`[Payment] Creating checkout: ${planId} / ${billingPeriod} / ${amount} TRY`);

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
    console.log(`[Payment] Webhook: ${event.type} for session ${event.sessionId}`);

    switch (event.type) {
      case "payment.success":
        // Activate subscription
        console.log(`[Payment] Subscription activated: ${event.planId} for user ${event.userId}`);
        break;
      case "payment.failed":
        console.log(`[Payment] Payment failed for user ${event.userId}`);
        break;
      case "subscription.cancelled":
        console.log(`[Payment] Subscription cancelled for user ${event.userId}`);
        break;
      case "subscription.renewed":
        console.log(`[Payment] Subscription renewed: ${event.planId} for user ${event.userId}`);
        break;
    }
  }

  async cancelSubscription(userId: string): Promise<{ success: boolean }> {
    console.log(`[Payment] Cancelling subscription for user ${userId}`);
    return { success: true };
  }
}

export const paymentService = new PaymentService();
