import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getVendorReviews, getVendorSummary, createVendorReview } from "@/lib/community";
import { moderateContent } from "@/lib/services/content-moderation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendor = searchParams.get("vendor");
    const summaryOnly = searchParams.get("summary");
    const page = parseInt(searchParams.get("page") || "1");

    if (summaryOnly === "true") {
      const data = await getVendorSummary();
      return NextResponse.json({ success: true, data });
    }

    const data = await getVendorReviews(vendor || undefined, page);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Değerlendirmeler alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (!body.vendorName || !body.rating) {
      return NextResponse.json({ error: "Firma adı ve puan gerekli" }, { status: 400 });
    }

    // Content moderation for comment
    if (body.comment) {
      const modResult = await moderateContent(body.comment);
      if (!modResult.approved) {
        return NextResponse.json(
          { error: "Yorum moderasyon kontrolünden geçemedi", reasons: modResult.reasons },
          { status: 422 },
        );
      }
      body.comment = modResult.sanitizedContent || body.comment;
    }

    const review = await createVendorReview(user.id, {
      vendorName: body.vendorName,
      vendorTaxNo: body.vendorTaxNo,
      rating: parseFloat(body.rating),
      workQuality: body.workQuality ? parseFloat(body.workQuality) : undefined,
      timeliness: body.timeliness ? parseFloat(body.timeliness) : undefined,
      communication: body.communication ? parseFloat(body.communication) : undefined,
      pricePerformance: body.pricePerformance ? parseFloat(body.pricePerformance) : undefined,
      comment: body.comment,
      projectType: body.projectType,
      isAnonymous: body.isAnonymous ?? true,
    });
    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Değerlendirme eklenemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
