import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCountryProfiles, seedInternationalData } from "@/lib/international";

export async function GET() {
  try {
    await requireAuth();

    let countries = await getCountryProfiles();
    if (countries.length === 0) {
      await seedInternationalData();
      countries = await getCountryProfiles();
    }

    return NextResponse.json(countries);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
