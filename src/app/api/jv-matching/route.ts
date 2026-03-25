import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createJvRequest, getJvRequests, getJvStats } from "@/lib/jv-matching";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "stats") {
      const companyId = searchParams.get("companyId") || undefined;
      const stats = await getJvStats(companyId);
      return NextResponse.json(stats);
    }

    const status = searchParams.get("status") as "OPEN" | "MATCHED" | "CLOSED" | null;
    const city = searchParams.get("city") || undefined;
    const specialty = searchParams.get("specialty") || undefined;

    const requests = await getJvRequests({
      ...(status && { status }),
      ...(city && { city }),
      ...(specialty && { specialty }),
    });

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
    if (!user.companyId) {
      return NextResponse.json({ error: "Firma profiliniz tanımlı değil" }, { status: 400 });
    }

    const body = await req.json();
    const { title, description, requiredSpecialty, requiredExperienceAmount, city, tenderId } = body;

    if (!title || !description || !requiredSpecialty || !requiredExperienceAmount || !city) {
      return NextResponse.json({ error: "Zorunlu alanlar eksik" }, { status: 400 });
    }

    const jvRequest = await createJvRequest({
      companyId: user.companyId,
      tenderId: tenderId || undefined,
      title,
      description,
      requiredSpecialty,
      requiredExperienceAmount: Number(requiredExperienceAmount),
      city,
    });

    return NextResponse.json(jvRequest, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Oturum açın" }, { status: 401 });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
