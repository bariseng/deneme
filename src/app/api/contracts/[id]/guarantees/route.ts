import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { addGuarantee } from "@/lib/contract-manager";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (!body.type || !body.bankName || !body.amount || !body.issueDate || !body.expiryDate) {
      return NextResponse.json({ error: "Gerekli alanlar eksik" }, { status: 400 });
    }

    const guarantee = await addGuarantee(id, user.id, {
      type: body.type,
      bankName: body.bankName,
      letterNo: body.letterNo,
      amount: parseFloat(body.amount),
      issueDate: new Date(body.issueDate),
      expiryDate: new Date(body.expiryDate),
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: guarantee }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Teminat eklenemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
