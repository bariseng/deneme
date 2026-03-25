import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getUserSessions, terminateAllSessions, getSecuritySummary } from "@/lib/security";

export async function GET() {
  try {
    const user = await requireAuth();
    const [sessions, summary] = await Promise.all([
      getUserSessions(user.id),
      getSecuritySummary(user.id, user.companyId),
    ]);
    return NextResponse.json({ success: true, data: { sessions, summary } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Oturumlar alınamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await requireAuth();
    await terminateAllSessions(user.id);
    return NextResponse.json({ success: true, message: "Tüm oturumlar sonlandırıldı" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Oturumlar sonlandırılamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
