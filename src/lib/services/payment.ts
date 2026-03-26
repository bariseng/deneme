// ─── iyzico Payment Service ─────────────────────────────────
// Real integration with iyzico SDK for Turkish market
// 3D Secure mandatory, tokenization-based (no CC storage)

import { prisma } from "@/lib/prisma";

// iyzipay is a CJS module — must use require() for runtime
// eslint-disable-next-line @typescript-eslint/no-require-imports
const IyzipaySDK: typeof import("iyzipay") = require("iyzipay");


// ─── Types ──────────────────────────────────────────────────

export type PlanId = "free" | "basic" | "pro" | "enterprise";

export interface PricingPlan {
  id: PlanId;
  name: string;
  price: number;
  yearlyPrice: number;
  features: string[];
  highlighted?: boolean;
  iyzicoProductRef?: string;
  iyzicoMonthlyPlanRef?: string;
  iyzicoYearlyPlanRef?: string;
}

export interface CheckoutResult {
  token: string;
  checkoutFormContent: string;
  tokenExpireTime: number;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  status?: string;
  paidPrice?: number;
  installment?: number;
  cardLastFour?: string;
  errorMessage?: string;
}

// ─── Pricing Plans ──────────────────────────────────────────

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Ücretsiz",
    price: 0,
    yearlyPrice: 0,
    features: [
      "Günlük 10 ihale görüntüleme",
      "Temel arama & filtreleme",
      "3 favori ihale",
      "Günlük 5 bildirim",
    ],
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
      "Rakip analizi (5 firma)",
      "Aylık 50 teklif hazırlama",
      "Aylık 100 AI kredisi",
      "PDF export & raporlama",
      "Öncelikli destek",
    ],
  },
  {
    id: "enterprise",
    name: "Kurumsal",
    price: 1999,
    yearlyPrice: 19190,
    features: [
      "Profesyonel'deki her şey +",
      "Sınırsız rakip takibi & AI kredisi",
      "Agentic AI İhale Avcısı",
      "Akıllı teklif optimizasyonu",
      "API erişimi",
      "5 kullanıcı koltuğu",
      "SLA garantisi (%99.9)",
    ],
  },
];

export function getPlanById(id: PlanId): PricingPlan | undefined {
  return PRICING_PLANS.find((p) => p.id === id);
}

// ─── iyzico Result Types (local copies for type safety) ─────

interface IyzicoBaseResult {
  status: string;
  errorCode?: string;
  errorMessage?: string;
}

interface IyzicoCheckoutInitResult extends IyzicoBaseResult {
  token?: string;
  checkoutFormContent?: string;
  tokenExpireTime?: number;
}

interface IyzicoCheckoutResult extends IyzicoBaseResult {
  paymentId?: string;
  paidPrice?: number;
  installment?: number;
  lastFourDigits?: string;
  paymentStatus?: string;
}

interface IyzicoSubInitResult extends IyzicoBaseResult {
  data?: {
    checkoutFormContent: string;
    token: string;
    tokenExpireTime: number;
  };
}

interface IyzicoInstallmentResult extends IyzicoBaseResult {
  installmentDetails?: {
    installmentPrices: {
      installmentNumber: number;
      totalPrice: string;
      installmentPrice: string;
      installmentRate: number;
    }[];
  }[];
}

// ─── iyzico Client ──────────────────────────────────────────

function getIyzipayClient(): InstanceType<typeof IyzipaySDK> {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const baseUrl = process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com";

  if (!apiKey || !secretKey) {
    throw new Error("IYZICO_API_KEY ve IYZICO_SECRET_KEY tanımlanmalı");
  }

  return new IyzipaySDK({ uri: baseUrl, apiKey, secretKey });
}

// ─── Promisify iyzipay callbacks ────────────────────────────

function promisify<T>(fn: (cb: (err: Error | null, result: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((err, result) => {
      if (err) return reject(err);
      const r = result as T & { status?: string; errorMessage?: string };
      if (r.status === "failure") {
        return reject(new Error(r.errorMessage || "iyzico hatası"));
      }
      resolve(result);
    });
  });
}

// ─── Checkout Form (3D Secure) ──────────────────────────────

export async function createCheckoutForm(params: {
  planId: PlanId;
  billingPeriod: "monthly" | "yearly";
  userId: string;
  userName: string;
  userSurname: string;
  userEmail: string;
  userPhone?: string;
  userIp: string;
  callbackUrl: string;
}): Promise<CheckoutResult> {
  const plan = getPlanById(params.planId);
  if (!plan || plan.id === "free") throw new Error("Geçersiz plan");

  const amount = params.billingPeriod === "yearly" ? plan.yearlyPrice : plan.price;
  const priceStr = amount.toFixed(2);
  const basketId = `sub_${params.userId}_${Date.now()}`;

  const iyzipay = getIyzipayClient();

  // Create pending payment record
  await prisma.payment.create({
    data: {
      userId: params.userId,
      planId: params.planId,
      amount,
      status: "pending",
      provider: "iyzico",
      billingPeriod: params.billingPeriod,
      providerTxId: basketId,
    },
  });

  const result = await promisify<IyzicoCheckoutInitResult>((cb) =>
    iyzipay.checkoutFormInitialize.create(
      {
        locale: IyzipaySDK.LOCALE.TR,
        conversationId: basketId,
        price: priceStr,
        paidPrice: priceStr,
        currency: IyzipaySDK.CURRENCY.TRY,
        basketId,
        paymentGroup: IyzipaySDK.PAYMENT_GROUP.SUBSCRIPTION,
        callbackUrl: params.callbackUrl,
        enabledInstallments: [1, 2, 3, 6, 9, 12],
        buyer: {
          id: params.userId,
          name: params.userName,
          surname: params.userSurname,
          email: params.userEmail,
          gsmNumber: params.userPhone || "+905000000000",
          identityNumber: "11111111111",
          registrationAddress: "İstanbul, Türkiye",
          ip: params.userIp,
          city: "Istanbul",
          country: "Turkey",
        },
        shippingAddress: {
          contactName: `${params.userName} ${params.userSurname}`,
          city: "Istanbul",
          country: "Turkey",
          address: "İstanbul, Türkiye",
        },
        billingAddress: {
          contactName: `${params.userName} ${params.userSurname}`,
          city: "Istanbul",
          country: "Turkey",
          address: "İstanbul, Türkiye",
        },
        basketItems: [
          {
            id: params.planId,
            name: `İhalePro ${plan.name} — ${params.billingPeriod === "yearly" ? "Yıllık" : "Aylık"}`,
            category1: "Abonelik",
            itemType: IyzipaySDK.BASKET_ITEM_TYPE.VIRTUAL,
            price: priceStr,
          },
        ],
      },
      cb,
    ),
  );

  if (!result.token || !result.checkoutFormContent) {
    throw new Error("iyzico checkout form oluşturulamadı");
  }

  return {
    token: result.token,
    checkoutFormContent: result.checkoutFormContent,
    tokenExpireTime: result.tokenExpireTime || 0,
  };
}

// ─── Retrieve CheckoutForm result ───────────────────────────

export async function retrieveCheckoutResult(token: string): Promise<PaymentResult> {
  const iyzipay = getIyzipayClient();

  const result = await promisify<IyzicoCheckoutResult>((cb) =>
    iyzipay.checkoutForm.retrieve({ locale: IyzipaySDK.LOCALE.TR, token }, cb),
  );

  const success = result.status === "success" && result.paymentStatus === "SUCCESS";

  return {
    success,
    paymentId: result.paymentId,
    status: result.paymentStatus,
    paidPrice: result.paidPrice,
    installment: result.installment,
    cardLastFour: result.lastFourDigits,
    errorMessage: result.errorMessage,
  };
}

// ─── Subscription Checkout ──────────────────────────────────

export async function createSubscriptionCheckout(params: {
  pricingPlanRef: string;
  userId: string;
  userName: string;
  userSurname: string;
  userEmail: string;
  userPhone?: string;
  callbackUrl: string;
}): Promise<{ checkoutFormContent: string; token: string }> {
  const iyzipay = getIyzipayClient();

  const result = await promisify<IyzicoSubInitResult>((cb) =>
    iyzipay.subscriptionCheckoutForm.initialize(
      {
        locale: IyzipaySDK.LOCALE.TR,
        conversationId: `sub_init_${params.userId}_${Date.now()}`,
        callbackUrl: params.callbackUrl,
        pricingPlanReferenceCode: params.pricingPlanRef,
        subscriptionInitialStatus: IyzipaySDK.SUBSCRIPTION_INITIAL_STATUS.ACTIVE,
        customer: {
          name: params.userName,
          surname: params.userSurname,
          email: params.userEmail,
          gsmNumber: params.userPhone || "+905000000000",
          identityNumber: "11111111111",
          shippingAddress: {
            contactName: `${params.userName} ${params.userSurname}`,
            city: "Istanbul",
            country: "Turkey",
            address: "İstanbul, Türkiye",
          },
          billingAddress: {
            contactName: `${params.userName} ${params.userSurname}`,
            city: "Istanbul",
            country: "Turkey",
            address: "İstanbul, Türkiye",
          },
        },
      },
      cb,
    ),
  );

  if (!result.data?.checkoutFormContent || !result.data?.token) {
    throw new Error("iyzico abonelik checkout oluşturulamadı");
  }

  return {
    checkoutFormContent: result.data.checkoutFormContent,
    token: result.data.token,
  };
}

// ─── Cancel Subscription ────────────────────────────────────

export async function cancelSubscription(userId: string): Promise<{ success: boolean }> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) throw new Error("Aktif abonelik bulunamadı");

  // If we have iyzico subscription ref, cancel on iyzico side too
  if (sub.iyzicoSubscriptionRef) {
    const iyzipay = getIyzipayClient();
    await promisify<{ status: string; errorMessage?: string }>((cb) =>
      iyzipay.subscription.cancel(
        {
          locale: IyzipaySDK.LOCALE.TR,
          subscriptionReferenceCode: sub.iyzicoSubscriptionRef!,
        },
        cb,
      ),
    );
  }

  await prisma.subscription.update({
    where: { userId },
    data: { status: "cancelled", cancelledAt: new Date() },
  });

  // Downgrade to FREE at period end (don't immediately cut access)
  return { success: true };
}

// ─── Get Installment Info ───────────────────────────────────

export async function getInstallmentInfo(
  binNumber: string,
  price: number,
): Promise<{ installmentNumber: number; totalPrice: string; installmentPrice: string; installmentRate: number }[]> {
  const iyzipay = getIyzipayClient();

  const result = await promisify<IyzicoInstallmentResult>((cb) =>
    iyzipay.installmentInfo.retrieve(
      {
        locale: IyzipaySDK.LOCALE.TR,
        binNumber: binNumber.substring(0, 6),
        price: price.toFixed(2),
      },
      cb,
    ),
  );

  return result.installmentDetails?.[0]?.installmentPrices || [];
}

// ─── Health Check ───────────────────────────────────────────

export async function iyzicoHealthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const iyzipay = getIyzipayClient();
    await promisify<{ status: string; errorMessage?: string }>((cb) =>
      iyzipay.apiTest.retrieve({}, cb),
    );
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
