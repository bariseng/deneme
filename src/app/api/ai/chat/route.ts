import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const responses: Record<string, string> = {
  merhaba: "Merhaba! Ben İhalePro AI Asistanı. Size ihale arama, risk analizi, fiyat tahmini ve daha birçok konuda yardımcı olabilirim. Nasıl yardımcı olabilirim?",
  ihale: "İhale araması için /ihaleler sayfasını ziyaret edebilir veya bana aradığınız ihale türünü, şehri ve bütçe aralığını söyleyebilirsiniz.",
  fiyat: "Fiyat tahmini için ihale detay sayfasındaki **AI Fiyat Tahmini** özelliğini kullanabilirsiniz. Geçmiş benzer ihalelerin analizi yapılarak size min-max aralığı sunulur.",
  risk: "Risk analizi, ihale şartnamesi, bütçe, rekabet durumu ve zaman çizelgesini değerlendirerek size kapsamlı bir risk skoru sunar.",
  teklif: "Teklif hazırlama için /teklifler sayfasından yeni teklif oluşturabilirsiniz. Birim fiyat tablosu, mektup şablonu ve PDF export özellikleri mevcuttur.",
  rakip: "Rakip analizi için /firmalar sayfasını ziyaret edin. Firma adı veya vergi numarası ile arama yapabilir, kazandıkları ihaleleri inceleyebilirsiniz.",
};

function getAIResponse(message: string): string {
  const lower = message.toLowerCase();

  for (const [key, response] of Object.entries(responses)) {
    if (lower.includes(key)) return response;
  }

  return "Anlıyorum. Size daha iyi yardımcı olabilmem için lütfen konuyu biraz daha açar mısınız? İhale arama, risk analizi, fiyat tahmini veya teklif hazırlama konularında size yardımcı olabilirim.";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { message, conversationId, tenderId } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Mesaj zorunludur" }, { status: 400 });
    }

    let convoId = conversationId;

    if (user) {
      if (!convoId) {
        const convo = await prisma.aiConversation.create({
          data: {
            userId: user.id,
            tenderId,
            conversationType: tenderId ? "IHALE_ANALIZ" : "GENEL",
            title: message.slice(0, 50),
          },
        });
        convoId = convo.id;
      }

      await prisma.aiMessage.create({
        data: { conversationId: convoId, role: "user", content: message },
      });
    }

    const aiResponse = getAIResponse(message);

    if (user && convoId) {
      await prisma.aiMessage.create({
        data: { conversationId: convoId, role: "assistant", content: aiResponse },
      });
    }

    // Streaming response simulation
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const words = aiResponse.split(" ");
        for (const word of words) {
          controller.enqueue(encoder.encode(word + " "));
          await new Promise((r) => setTimeout(r, 30));
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Conversation-Id": convoId || "",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI yanıt oluşturulamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
