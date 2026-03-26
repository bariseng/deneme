import { NextRequest, NextResponse } from "next/server";
import { retrieveCheckoutResult } from "@/lib/services/payment";
import { processWebhookEvent } from "@/lib/services/iyzico-webhook";

/**
 * POST /api/payments/callback
 * iyzico redirects here after 3D Secure completion
 * Body: { token }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = formData.get("token") as string;

    if (!token) {
      return redirectToResult("error", "Token bulunamadı");
    }

    // Verify payment with iyzico
    const result = await retrieveCheckoutResult(token);

    if (!result.success) {
      return redirectToResult("error", result.errorMessage || "Ödeme başarısız");
    }

    // Process the successful checkout
    await processWebhookEvent({
      iyziEventType: "CHECKOUT_FORM_AUTH",
      iyziEventTime: Date.now(),
      token,
      paymentId: result.paymentId,
    });

    return redirectToResult("success", "Ödeme başarılı! Aboneliğiniz aktif edildi.");
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Ödeme doğrulama hatası";
    return redirectToResult("error", msg);
  }
}

function redirectToResult(status: string, message: string): NextResponse {
  const params = new URLSearchParams({ status, message });
  const url = `/ayarlar/abonelik?${params.toString()}`;

  return NextResponse.redirect(new URL(url, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"), {
    status: 303,
  });
}
