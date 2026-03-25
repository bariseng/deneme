import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getContractDetail, updateContract, deleteContract } from "@/lib/contract-manager";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const contract = await getContractDetail(id, user.id);
    if (!contract) {
      return NextResponse.json({ error: "Sözleşme bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: contract });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sözleşme alınamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    await updateContract(id, user.id, {
      status: body.status,
      title: body.title,
      notes: body.notes,
      completionRate: body.completionRate != null ? parseFloat(body.completionRate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sözleşme güncellenemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await deleteContract(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sözleşme silinemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
