// ─── iyzico Webhook Handler ─────────────────────────────────
// IYZWSv2 signature verification + idempotency + event processing

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { upgradePlan } from "@/lib/quota";
import { retrieveCheckoutResult, type PlanId } from "./payment";

// ─── Types ──────────────────────────────────────────────────

export interface IyzicoWebhookPayload {
  iyziEventType: string;
  iyziEventTime: number;
  iyziReferenceCode?: string;
  token?: string;
  paymentId?: string;
  paymentConversationId?: string;
  status?: string;
  subscriptionReferenceCode?: string;
}

interface WebhookProcessResult {
  success: boolean;
  action: string;
  details?: string;
}

// ─── IYZWSv2 Signature Verification ─────────────────────────
// Reference: iyzico webhook docs — HMAC-SHA256 based

export function verifyIyzicoSignature(
  secretKey: string,
  iyzicoSignature: string,
  payload: string,
): boolean {
  if (!iyzicoSignature || !payload) return false;

  try {
    // iyzico sends: IYZWSv2 <hash>
    const signatureParts = iyzicoSignature.split(" ");
    if (signatureParts.length !== 2 || signatureParts[0] !== "IYZWSv2") {
      return false;
    }

    const receivedHash = signatureParts[1];

    // Generate HMAC-SHA256 of the raw payload body
    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(payload, "utf8")
      .digest("base64");

    // Timing-safe comparison
    const a = Buffer.from(receivedHash, "base64");
    const b = Buffer.from(computedHash, "base64");

    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ─── Idempotency Check ──────────────────────────────────────

async function isProcessed(eventKey: string): Promise<boolean> {
  const existing = await prisma.payment.findFirst({
    where: { providerTxId: eventKey },
    select: { id: true, status: true },
  });

  return existing?.status === "completed";
}

// ─── Webhook Event Router ───────────────────────────────────

export async function processWebhookEvent(
  payload: IyzicoWebhookPayload,
): Promise<WebhookProcessResult> {
  const eventType = payload.iyziEventType;
  const eventKey = payload.paymentId || payload.iyziReferenceCode || payload.token || "";

  // Idempotency: skip already-processed events
  if (eventKey && await isProcessed(eventKey)) {
    return { success: true, action: "skipped", details: "Event already processed" };
  }

  switch (eventType) {
    case "CHECKOUT_FORM_AUTH":
      return handleCheckoutComplete(payload);

    case "SUBSCRIPTION_ORDER_SUCCESS":
      return handleSubscriptionSuccess(payload);

    case "SUBSCRIPTION_ORDER_FAILURE":
      return handleSubscriptionFailure(payload);

    case "SUBSCRIPTION_CANCEL":
      return handleSubscriptionCancel(payload);

    case "SUBSCRIPTION_RENEW_SUCCESS":
      return handleSubscriptionRenew(payload);

    case "SUBSCRIPTION_RENEW_FAILURE":
      return handleRenewalFailure(payload);

    default:
      return { success: true, action: "ignored", details: `Unknown event: ${eventType}` };
  }
}

// ─── Event Handlers ─────────────────────────────────────────

async function handleCheckoutComplete(
  payload: IyzicoWebhookPayload,
): Promise<WebhookProcessResult> {
  const token = payload.token;
  if (!token) return { success: false, action: "error", details: "No token in payload" };

  // Retrieve actual payment result from iyzico
  const paymentResult = await retrieveCheckoutResult(token);

  if (!paymentResult.success) {
    // Mark payment as failed
    await prisma.payment.updateMany({
      where: { providerTxId: { contains: token.substring(0, 20) } },
      data: { status: "failed" },
    });

    return { success: false, action: "payment_failed", details: paymentResult.errorMessage };
  }

  // Find the pending payment by basketId (conversationId)
  const pendingPayment = await prisma.payment.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
  });

  if (!pendingPayment) {
    return { success: false, action: "error", details: "No pending payment found" };
  }

  // Update payment record
  await prisma.payment.update({
    where: { id: pendingPayment.id },
    data: {
      status: "completed",
      providerTxId: paymentResult.paymentId || token,
      iyzicoPaymentId: paymentResult.paymentId,
      installmentCount: paymentResult.installment || 1,
      cardLastFour: paymentResult.cardLastFour,
    },
  });

  // Activate subscription
  const planId = pendingPayment.planId as PlanId;
  const dbPlan = planIdToSubscriptionPlan(planId);
  const periodDays = pendingPayment.billingPeriod === "yearly" ? 365 : 30;

  await prisma.subscription.upsert({
    where: { userId: pendingPayment.userId },
    create: {
      userId: pendingPayment.userId,
      plan: dbPlan,
      status: "active",
      startDate: new Date(),
      endDate: new Date(Date.now() + periodDays * 86400000),
    },
    update: {
      plan: dbPlan,
      status: "active",
      startDate: new Date(),
      endDate: new Date(Date.now() + periodDays * 86400000),
      cancelledAt: null,
    },
  });

  // Update user plan + quotas
  await upgradePlan(pendingPayment.userId, dbPlan);

  // Trigger e-fatura via Paraşüt (fire-and-forget)
  triggerInvoice(pendingPayment.userId, pendingPayment.id).catch(() => {});

  return {
    success: true,
    action: "payment_success",
    details: `Plan: ${dbPlan}, PaymentId: ${paymentResult.paymentId}`,
  };
}

async function handleSubscriptionSuccess(
  payload: IyzicoWebhookPayload,
): Promise<WebhookProcessResult> {
  const subRef = payload.subscriptionReferenceCode || payload.iyziReferenceCode;
  if (!subRef) return { success: false, action: "error", details: "No subscription ref" };

  // Find subscription by iyzico ref
  const sub = await prisma.subscription.findFirst({
    where: { iyzicoSubscriptionRef: subRef },
  });

  if (sub) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "active" },
    });

    await upgradePlan(sub.userId, sub.plan);
  }

  return { success: true, action: "subscription_activated", details: subRef };
}

async function handleSubscriptionFailure(
  payload: IyzicoWebhookPayload,
): Promise<WebhookProcessResult> {
  const subRef = payload.subscriptionReferenceCode || payload.iyziReferenceCode;
  if (!subRef) return { success: false, action: "error", details: "No subscription ref" };

  const sub = await prisma.subscription.findFirst({
    where: { iyzicoSubscriptionRef: subRef },
  });

  if (sub) {
    // Send notification to user about failed payment
    await sendPaymentFailedNotification(sub.userId);
  }

  return { success: true, action: "subscription_failed", details: subRef };
}

async function handleSubscriptionCancel(
  payload: IyzicoWebhookPayload,
): Promise<WebhookProcessResult> {
  const subRef = payload.subscriptionReferenceCode || payload.iyziReferenceCode;
  if (!subRef) return { success: false, action: "error", details: "No subscription ref" };

  const sub = await prisma.subscription.findFirst({
    where: { iyzicoSubscriptionRef: subRef },
  });

  if (sub) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "cancelled", cancelledAt: new Date() },
    });

    // Don't immediately downgrade — let them use until endDate
    await sendSubscriptionCancelledNotification(sub.userId);
  }

  return { success: true, action: "subscription_cancelled", details: subRef };
}

async function handleSubscriptionRenew(
  payload: IyzicoWebhookPayload,
): Promise<WebhookProcessResult> {
  const subRef = payload.subscriptionReferenceCode || payload.iyziReferenceCode;
  if (!subRef) return { success: false, action: "error", details: "No subscription ref" };

  const sub = await prisma.subscription.findFirst({
    where: { iyzicoSubscriptionRef: subRef },
  });

  if (sub) {
    const newEndDate = new Date(
      (sub.endDate || new Date()).getTime() + 30 * 86400000,
    );

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "active", endDate: newEndDate },
    });

    await upgradePlan(sub.userId, sub.plan);

    // Log renewal payment
    await prisma.payment.create({
      data: {
        userId: sub.userId,
        planId: sub.plan.toLowerCase(),
        amount: 0, // Will be filled by iyzico data
        status: "completed",
        provider: "iyzico",
        providerTxId: `renew_${subRef}_${Date.now()}`,
        billingPeriod: "monthly",
      },
    });
  }

  return { success: true, action: "subscription_renewed", details: subRef };
}

async function handleRenewalFailure(
  payload: IyzicoWebhookPayload,
): Promise<WebhookProcessResult> {
  const subRef = payload.subscriptionReferenceCode || payload.iyziReferenceCode;
  if (!subRef) return { success: false, action: "error", details: "No subscription ref" };

  const sub = await prisma.subscription.findFirst({
    where: { iyzicoSubscriptionRef: subRef },
  });

  if (sub) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "past_due" },
    });

    await sendPaymentFailedNotification(sub.userId);
  }

  return { success: true, action: "renewal_failed", details: subRef };
}

// ─── Helpers ────────────────────────────────────────────────

function planIdToSubscriptionPlan(planId: PlanId): "FREE" | "STARTER" | "PRO" | "ENTERPRISE" {
  const map: Record<PlanId, "FREE" | "STARTER" | "PRO" | "ENTERPRISE"> = {
    free: "FREE",
    basic: "STARTER",
    pro: "PRO",
    enterprise: "ENTERPRISE",
  };
  return map[planId] || "FREE";
}

async function sendPaymentFailedNotification(userId: string): Promise<void> {
  await prisma.notification.create({
    data: {
      userId,
      type: "SISTEM",
      title: "Ödeme Başarısız",
      message: "Abonelik ödemeniz gerçekleştirilemedi. Lütfen ödeme bilgilerinizi güncelleyin.",
      link: "/ayarlar/abonelik",
    },
  });
}

async function sendSubscriptionCancelledNotification(userId: string): Promise<void> {
  await prisma.notification.create({
    data: {
      userId,
      type: "SISTEM",
      title: "Abonelik İptal Edildi",
      message: "Aboneliğiniz dönem sonunda sona erecektir. İstediğiniz zaman yeniden abone olabilirsiniz.",
      link: "/fiyatlandirma",
    },
  });
}

async function triggerInvoice(userId: string, paymentId: string): Promise<void> {
  try {
    const { parasutProvider } = await import("@/lib/providers/parasut-provider");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (user?.companyId) {
      await parasutProvider.syncFinancials(user.companyId);
    }

    // Log invoice attempt
    await prisma.payment.update({
      where: { id: paymentId },
      data: { invoiceStatus: "triggered" },
    });
  } catch {
    // Invoice generation is non-blocking
  }
}
