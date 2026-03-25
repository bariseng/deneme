import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { useAICredit } from "@/lib/quota";
import { parseNaturalLanguage } from "@/lib/agent/nlp-parser";
import type { Prisma } from "@/generated/prisma";

const responses: Record<string, string> = {
  merhaba: "Merhaba! Ben İhalePro **Agentic AI** Asistanı. Size ihale arama, SWOT analizi, teklif taslağı, firma-ihale eşleştirme ve haftalık brifing konularında yardımcı olabilirim.\n\nDoğal dilde sorabilirsiniz: \"İstanbul'da 5 milyon üstü yapım ihalesi bul\"",
  ihale: "İhale araması yapıyorum... Doğal dilde arama yapabilirsiniz!\n\nÖrnekler:\n• \"Ankara'da hizmet ihalesi bul\"\n• \"10 milyon üstü yapım ihaleleri\"\n• \"İstanbul'da bilişim ihaleleri\"",
  fiyat: "Fiyat tahmini ve **otonom teklif taslağı** hazırlayabilirim. İhale detay sayfasında \"AI Teklif Taslağı\" butonunu kullanın.\n\nGeçmiş kazanan fiyatları analiz eder, optimal teklif aralığı ve birim fiyat tablosu önerir.",
  risk: "**SWOT Analizi** yapabilirim! \"Bu ihaleye girmeliyim mi?\" diye sorun.\n\nGüçlü/Zayıf yönler, Fırsatlar/Tehditler formatında kapsamlı strateji analizi sunarım.",
  teklif: "**Otonom Teklif Taslağı** özelliğim aktif! Benzer ihalelerin kazanan fiyatlarını analiz ederek:\n• Optimal teklif aralığı\n• Birim fiyat tablosu\n• Aşırı düşük sınır kontrolü\n• Kazanma olasılığı hesaplarım.",
  rakip: "Rakip analizi için /firmalar sayfasını ziyaret edin. Firma-ihale eşleştirme motorum sayesinde rakiplerinizin kazanma olasılıklarını da tahmin edebiliyorum.",
  swot: "SWOT analizi başlatıyorum! Lütfen analiz etmek istediğiniz ihaleyi belirtin veya ihale sayfasında \"SWOT Analizi\" butonunu kullanın.",
  eşleştir: "**İhale Avcısı** modunu aktifleştiriyorum! Firma profilinize en uygun ihaleleri tarayacağım.\n\nProfil ayarlarınızdan sektör, şehir ve bütçe tercihlerinizi güncelleyebilirsiniz.",
  brifing: "**Haftalık AI Brifing** oluşturuyorum! Firma profilinize göre:\n• En uygun ihaleler\n• Sektör trendleri\n• Rakip aktiviteleri\n• Aksiyon önerileri hazırlanacak.",
  avci: "**İhale Avcısı** arka planda çalışıyor! Her 6 saatte EKAP'ı tarar ve profilinize uygun ihaleleri otomatik bildirir.\n\n%80+ uyumlu ihaleler için anlık bildirim alırsınız.",
};

function getStaticResponse(message: string): string | null {
  const lower = message.toLowerCase().replace(/[?!.,]/g, "");

  for (const [key, response] of Object.entries(responses)) {
    if (lower.includes(key)) return response;
  }

  if (lower.includes("analiz") || lower.includes("girmeli") || lower.includes("katılmalı"))
    return responses.swot;
  if (lower.includes("bedel") || lower.includes("maliyet"))
    return responses.fiyat;
  if (lower.includes("belge") || lower.includes("doküman"))
    return "Şartname analizi için ihale detay sayfasındaki **AI Doküman Özeti** özelliğini kullanabilirsiniz.";
  if (lower.includes("sektör") || lower.includes("trend"))
    return "Sektörel trendleri haftalık brifing raporunda bulabilirsiniz. \"Brifing oluştur\" diyerek en güncel analizi alın.";
  if (lower.includes("selam") || lower.includes("günaydın") || lower.includes("iyi"))
    return responses.merhaba;

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { message, conversationId, tenderId } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Mesaj zorunludur" }, { status: 400 });
    }

    // AI credit check
    if (user) {
      const credit = await useAICredit(user.id, "chat", "AI Sohbet");
      if (!credit.success) {
        return NextResponse.json(
          { error: credit.message, upgradeRequired: true },
          { status: 403 }
        );
      }
    }

    let convoId = conversationId;

    // Parse intent
    const parsed = parseNaturalLanguage(message);
    let aiResponse: string;
    let searchResults: unknown = null;

    // Check if it's a natural language search query
    if (parsed.action === "search" && parsed.confidence >= 50) {
      // Execute search
      const where: Prisma.TenderWhereInput = { status: "BASVURU_ACIK" };

      if (parsed.filters.city) where.city = parsed.filters.city;
      if (parsed.filters.tenderType) {
        where.tenderType = parsed.filters.tenderType as Prisma.EnumTenderTypeFilter;
      }
      if (parsed.filters.minBudget || parsed.filters.maxBudget) {
        where.estimatedCost = {};
        if (parsed.filters.minBudget) where.estimatedCost.gte = parsed.filters.minBudget;
        if (parsed.filters.maxBudget) where.estimatedCost.lte = parsed.filters.maxBudget;
      }
      if (parsed.filters.keyword) {
        where.OR = [
          { title: { contains: parsed.filters.keyword, mode: "insensitive" } },
          { description: { contains: parsed.filters.keyword, mode: "insensitive" } },
        ];
      }

      const tenders = await prisma.tender.findMany({
        where,
        orderBy: { deadline: "asc" },
        take: 5,
        select: {
          id: true, title: true, city: true, estimatedCost: true,
          deadline: true, tenderType: true, institution: true,
        },
      });

      searchResults = tenders;

      if (tenders.length > 0) {
        const filterDesc: string[] = [];
        if (parsed.filters.city) filterDesc.push(parsed.filters.city);
        if (parsed.filters.tenderType) filterDesc.push(parsed.filters.tenderType);
        if (parsed.filters.minBudget) filterDesc.push(`${(parsed.filters.minBudget / 1_000_000).toFixed(1)}M+ ₺`);

        aiResponse = `**${tenders.length} ihale buldum!** (${filterDesc.join(", ")})\n\n`;
        for (const t of tenders) {
          const cost = t.estimatedCost ? `${(Number(t.estimatedCost) / 1_000_000).toFixed(1)}M ₺` : "—";
          const dl = new Date(t.deadline).toLocaleDateString("tr-TR");
          aiResponse += `• **${t.title}**\n  ${t.city} | ${cost} | Son: ${dl}\n\n`;
        }
        aiResponse += "Detaylı analiz için ihale başlığına tıklayın veya \"SWOT analizi yap\" diyebilirsiniz.";
      } else {
        aiResponse = `Arama kriterlerinize uygun aktif ihale bulunamadı. Filtreleri genişletmeyi deneyebilirsiniz.\n\nKriterler: ${JSON.stringify(parsed.filters)}`;
      }
    } else {
      // Static response
      aiResponse = getStaticResponse(message) ||
        "Size nasıl yardımcı olabilirim? Aşağıdaki komutları deneyebilirsiniz:\n\n• **Doğal dil arama**: \"İstanbul'da 5 milyon üstü yapım ihalesi bul\"\n• **SWOT Analizi**: \"Bu ihaleye girmeli miyim?\"\n• **Teklif Taslağı**: \"Teklif hazırla\"\n• **Eşleştirme**: \"Bana uygun ihaleleri göster\"\n• **Brifing**: \"Haftalık brifing oluştur\"\n• **İhale Avcısı**: \"Avcı modunu başlat\"";
    }

    // Persist conversation
    if (user) {
      if (!convoId) {
        const convoType = parsed.action === "swot" ? "SWOT_ANALIZ"
          : parsed.action === "bid_draft" ? "TEKLIF_TASLAK"
          : parsed.action === "match" ? "AGENT_AVCI"
          : tenderId ? "IHALE_ANALIZ"
          : "GENEL";

        const convo = await prisma.aiConversation.create({
          data: {
            userId: user.id,
            tenderId,
            conversationType: convoType,
            title: message.slice(0, 50),
          },
        });
        convoId = convo.id;
      }

      await prisma.aiMessage.createMany({
        data: [
          { conversationId: convoId, role: "user", content: message },
          { conversationId: convoId, role: "assistant", content: aiResponse },
        ],
      });
    }

    // Streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const words = aiResponse.split(" ");
        for (const word of words) {
          controller.enqueue(encoder.encode(word + " "));
          await new Promise((r) => setTimeout(r, 25));
        }
        // Send metadata at the end
        if (searchResults || convoId) {
          controller.enqueue(encoder.encode("\n__META__" + JSON.stringify({
            conversationId: convoId,
            searchResults,
            intent: parsed.action,
          })));
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Conversation-Id": convoId || "",
        "X-Intent": parsed.action,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI yanıt oluşturulamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
