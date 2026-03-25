import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createContract, getUserContracts, getContractSummary } from "@/lib/contract-manager";

export async function GET() {
  try {
    const user = await requireAuth();
    const [contracts, summary] = await Promise.all([
      getUserContracts(user.id),
      getContractSummary(user.id),
    ]);
    return NextResponse.json({ success: true, data: { contracts, summary } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sözleşmeler alınamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (!body.tenderId || !body.title || !body.contractDate || !body.startDate || !body.endDate || !body.totalAmount) {
      return NextResponse.json({ error: "Gerekli alanlar eksik" }, { status: 400 });
    }

    const contract = await createContract(user.id, {
      tenderId: body.tenderId,
      contractNo: body.contractNo,
      title: body.title,
      contractDate: new Date(body.contractDate),
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      totalAmount: parseFloat(body.totalAmount),
      kdvRate: body.kdvRate ? parseFloat(body.kdvRate) : undefined,
      advanceRate: body.advanceRate ? parseFloat(body.advanceRate) : undefined,
      penaltyRate: body.penaltyRate ? parseFloat(body.penaltyRate) : undefined,
      penaltyDetails: body.penaltyDetails,
      warrantyMonths: body.warrantyMonths ? parseInt(body.warrantyMonths) : undefined,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: contract }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sözleşme oluşturulamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
