import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createPayment } from "@/lib/contract-manager";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (!body.periodStart || !body.periodEnd || !body.grossAmount) {
      return NextResponse.json({ error: "Gerekli alanlar eksik" }, { status: 400 });
    }

    const payment = await createPayment(id, user.id, {
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      grossAmount: parseFloat(body.grossAmount),
      deductions: body.deductions ? parseFloat(body.deductions) : undefined,
      description: body.description,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hakediş oluşturulamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
