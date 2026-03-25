import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { useAICredit } from "@/lib/quota";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    // AI credit check
    const credit = await useAICredit(user.id, "summary", "İhale Özeti");
    if (!credit.success) {
      return NextResponse.json(
        { error: credit.message, upgradeRequired: true },
        { status: 403 }
      );
    }

    const { tenderId } = await request.json();
    if (!tenderId) {
      return NextResponse.json({ error: "İhale ID zorunludur" }, { status: 400 });
    }

    const tender = await prisma.tender.findUnique({
      where: { id: tenderId },
      include: { documents: true, timeline: true },
    });

    if (!tender) {
      return NextResponse.json({ error: "İhale bulunamadı" }, { status: 404 });
    }

    // AI özet oluştur (simülasyon)
    const summary = [
      `**${tender.title}** kapsamında ${tender.institution} tarafından düzenlenen bu ihalede, ${tender.city} ilinde gerçekleştirilecek ${tender.tenderType === "YAPIM" ? "yapım işi" : tender.tenderType === "HIZMET" ? "hizmet alımı" : tender.tenderType === "MAL_ALIMI" ? "mal alımı" : "danışmanlık hizmeti"} için teklif toplanmaktadır.`,
      `Tahmini maliyet **${Number(tender.estimatedCost).toLocaleString("tr-TR")} TL** olarak belirlenmiştir.`,
      `Son başvuru tarihi **${new Date(tender.deadline).toLocaleDateString("tr-TR")}** olarak açıklanmıştır.`,
      `İhale kapsamında ${tender.documents.length} adet doküman bulunmaktadır.`,
      `İsteklilerin geçici teminat oranı %${tender.guaranteeRate || 6} olarak belirlenmiştir.`,
    ].join("\n\n");

    const keyDates = JSON.stringify([
      { label: "İlan Tarihi", date: tender.publishDate },
      { label: "Son Başvuru", date: tender.deadline },
      { label: "Açılış Tarihi", date: tender.openingDate },
    ]);

    const risks = JSON.stringify([
      "Yüksek rekabetin teklif fiyatlarını düşürmesi beklenmektedir",
      "Teknik personel yeterliliği dikkatle değerlendirilmelidir",
      "İş deneyim belgesi eşik değeri kontrol edilmelidir",
    ]);

    const aiSummary = await prisma.aiTenderSummary.upsert({
      where: { id: tenderId },
      update: { summary, keyDates, risks, effortLevel: "Orta", confidence: 0.82 },
      create: {
        tenderId,
        summary,
        keyDates,
        risks,
        effortLevel: "Orta",
        confidence: 0.82,
      },
    });

    return NextResponse.json({ success: true, data: aiSummary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Özet oluşturulamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
