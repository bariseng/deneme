import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createGuaranteeRequest, getGuaranteeRequests } from "@/lib/finance";

export async function GET() {
  try {
    const user = await requireAuth();
    const requests = await getGuaranteeRequests(user.id);
    return NextResponse.json(requests);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Oturum açın" }, { status: 401 });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { type, amount, duration, description, tenderId } = body;

    if (!type || !amount || !duration) {
      return NextResponse.json({ error: "Zorunlu alanlar eksik" }, { status: 400 });
    }

    const request = await createGuaranteeRequest({
      userId: user.id,
      tenderId: tenderId || undefined,
      type,
      amount: Number(amount),
      duration: Number(duration),
      description,
    });

    return NextResponse.json(request, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Oturum açın" }, { status: 401 });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
