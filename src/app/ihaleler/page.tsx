import type { Metadata } from "next";
import { Suspense } from "react";
import TenderListClient from "./TenderListClient";

export const metadata: Metadata = {
  title: "İhale Bul",
  description:
    "Türkiye genelindeki güncel kamu ve özel sektör ihalelerini arayın, filtreleyin ve takip edin. Yapay zeka destekli ihale arama motoru.",
  openGraph: {
    title: "İhale Bul | İhalePro",
    description:
      "Gelişmiş filtreler ve yapay zeka destekli arama ile ihtiyacınıza uygun ihaleleri bulun.",
  },
};

export default function TenderListPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background-alt min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-foreground-light">
            Yükleniyor...
          </div>
        </div>
      }
    >
      <TenderListClient />
    </Suspense>
  );
}
