import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getClientIp } from "@/lib/security/rate-limit";
import {
  getConsentStatus,
  recordConsent,
  exportUserData,
  requestDataDeletion,
  getDeletionRequests,
  DATA_TYPES,
} from "@/lib/services/privacy";

/**
 * GET /api/privacy — Consent status, data types, deletion requests
 * POST /api/privacy — Record consent, export data, request deletion
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "consent") {
      const consent = await getConsentStatus(user.id);
      return NextResponse.json({ success: true, consent });
    }

    if (action === "export") {
      const data = await exportUserData(user.id);
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="ihalepro-verilerim-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      });
    }

    if (action === "deletions") {
      const deletions = await getDeletionRequests(user.id);
      return NextResponse.json({ success: true, deletions });
    }

    // Default: return available data types and consent
    const [consent, deletions] = await Promise.all([
      getConsentStatus(user.id),
      getDeletionRequests(user.id),
    ]);

    return NextResponse.json({
      success: true,
      dataTypes: DATA_TYPES,
      consent,
      deletions,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Gizlilik hatası";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapın" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { action } = body;
    const ip = getClientIp(request.headers);

    if (action === "consent") {
      const { consentType, accepted } = body;
      if (!consentType || accepted === undefined) {
        return NextResponse.json({ error: "consentType ve accepted zorunlu" }, { status: 400 });
      }
      await recordConsent(user.id, consentType, accepted, ip);
      return NextResponse.json({ success: true, message: "Rıza kaydedildi" });
    }

    if (action === "delete") {
      const { dataTypes, reason } = body;
      if (!dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
        return NextResponse.json({ error: "En az bir veri türü seçin" }, { status: 400 });
      }
      const result = await requestDataDeletion(user.id, dataTypes, reason || "", ip);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Gizlilik hatası";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapın" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
