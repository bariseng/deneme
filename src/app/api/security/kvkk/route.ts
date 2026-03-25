import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createDeletionRequest, getUserDeletionRequests } from "@/lib/security";

export async function GET() {
  try {
    const user = await requireAuth();
    const requests = await getUserDeletionRequests(user.id);
    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    const message = error instanceof Error ? error.message : "KVKK talepleri alınamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (!body.dataTypes?.length) {
      return NextResponse.json({ error: "Silinecek veri türlerini seçin" }, { status: 400 });
    }

    const req = await createDeletionRequest(user.id, {
      reason: body.reason,
      dataTypes: body.dataTypes,
    });
    return NextResponse.json({ success: true, data: req }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Talep oluşturulamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
