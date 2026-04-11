import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Ciro Güncelleme Hesaplama 2026 | KikBul",
  description:
    "İhalelerde ciro güncelleme hesaplama aracı. Yİ-ÜFE endeksi ile ciro tutarınızı güncelleyin. Hangi yılların cirosu geçerli?",
  alternates: { canonical: "https://kikbul.com/ciro-guncelleme" },
  openGraph: {
    title: "Ciro Güncelleme Hesaplama 2026 | KikBul",
    description:
      "İhalelerde ciro güncelleme hesaplama aracı. Yİ-ÜFE endeksi ile ciro tutarınızı güncelleyin.",
    type: "website",
    locale: "tr_TR",
    siteName: "KikBul",
  },
};

export const revalidate = 86400;

async function getPageData() {
  const [ciroKararlar, sozlukTerimleri, sonEndeks] = await Promise.all([
    prisma.boardDecision.findMany({
      where: {
        OR: [
          { subject: { contains: "ciro", mode: "insensitive" } },
          { subject: { contains: "bilanço", mode: "insensitive" } },
        ],
      },
      orderBy: { decisionDate: "desc" },
      take: 5,
      select: { id: true, decisionNo: true, subject: true, decisionDate: true },
    }),
    prisma.glossaryTerm.findMany({
      where: {
        OR: [
          { term: { contains: "ciro", mode: "insensitive" } },
          { term: { contains: "yi-üfe", mode: "insensitive" } },
        ],
      },
      take: 4,
      select: { slug: true, term: true },
    }),
    prisma.macroPriceIndex.findFirst({
      where: { code: "YIUFE" },
      orderBy: { period: "desc" },
    }),
  ]);

  return { ciroKararlar, sozlukTerimleri, sonEndeks };
}

const faqItems = [
  {
    q: "İhalelerde ciro güncelleme nedir?",
    a: "Ciro güncelleme, ihalelerde ekonomik ve mali yeterlik kapsamında istenen ciro belgelerinin, ait olduğu yıldan ihale yılına kadar geçen süredeki fiyat değişimlerini yansıtmak amacıyla Yİ-ÜFE endeksi ile güncellenmesidir.",
  },
  {
    q: "Hangi yılların cirosu ihaleye sunulabilir?",
    a: "İhalelerde, ihale ilan tarihinden önceki son 5 yılın ciroları sunulabilir. İstekliler bu 5 yıldan herhangi birini veya birkaçını seçerek ciro yeterliğini sağlayabilir.",
  },
  {
    q: "Ciro güncelleme formülü nedir?",
    a: "Güncellenmiş Ciro = Ciro Tutarı x (İhale Ilan Ayından Bir Önceki Ayın Yİ-ÜFE / Ciro Yılı Haziran Ayı Yİ-ÜFE). Bu formül, tüm ihale uygulama yönetmelikleri için geçerlidir.",
  },
  {
    q: "Toplam ciro mu yoksa ihale konusu iş cirosu mu güncellenir?",
    a: "Her ikisi de güncellenebilir. İdari şartnamede toplam ciro veya ihale konusu iş cirosu istenebilir. Hangi cironun istendiğine göre güncelleme yapılmalıdır.",
  },
];

export default async function CiroGuncellemePage() {
  const { ciroKararlar, sozlukTerimleri, sonEndeks } = await getPageData();

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "KikBul Ciro Güncelleme Hesaplama Aracı",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
    description: "İhalelerde ciro güncelleme hesaplama aracı. Yİ-ÜFE endeksi ile ciro tutarınızı güncelleyin.",
    url: "https://kikbul.com/ciro-guncelleme",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://kikbul.com" },
      { "@type": "ListItem", position: 2, name: "Hesaplamalar", item: "https://kikbul.com/hesaplamalar" },
      { "@type": "ListItem", position: 3, name: "Ciro Güncelleme", item: "https://kikbul.com/ciro-guncelleme" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <ol className="flex items-center gap-1.5">
            <li><Link href="/" className="hover:text-foreground transition-colors">Ana Sayfa</Link></li>
            <li className="before:content-['/'] before:mx-1.5">
              <Link href="/hesaplamalar" className="hover:text-foreground transition-colors">Hesaplamalar</Link>
            </li>
            <li className="before:content-['/'] before:mx-1.5 font-medium text-foreground">Ciro Güncelleme</li>
          </ol>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          Ciro Güncelleme Hesaplama 2026
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          İhalelerde sunduğunuz ciro belgelerini Yİ-ÜFE endeksi ile güncelleyin. Hangi yılların cirosu geçerli, nasıl hesaplanır, detaylı rehber.
        </p>

        {/* Calculator CTA */}
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-8 mb-10 text-center">
          <h2 className="text-xl font-bold mb-3">Online Ciro Güncelleme Hesaplama</h2>
          <p className="text-muted-foreground mb-2">
            Ciro yılını ve tutarını girerek güncellenmiş ciro tutarını hesaplayın.
          </p>
          {sonEndeks && (
            <p className="text-sm text-muted-foreground mb-4">
              Son Yİ-ÜFE: <strong>{Number(sonEndeks.value).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</strong> ({sonEndeks.period})
            </p>
          )}
          <Link href="/hesaplamalar" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Hesaplamaya Başla &rarr;
          </Link>
        </div>

        {/* Ciro Güncelleme Nedir? */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="ciro-guncelleme-nedir">Ciro Güncelleme Nedir?</h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              Kamu ihalelerinde ekonomik ve mali yeterlik kriterleri kapsamında isteklilerden belirli bir ciro tutarını karşılamaları istenir. Geçmiş yıllara ait ciro belgeleri, ilgili yıllardan ihale yılına kadar geçen süredeki enflasyonu yansıtmak amacıyla Yİ-ÜFE endeksi ile güncellenir.
            </p>
            <p>
              Bu güncelleme, isteklilerin geçmiş yıllardaki ciro performanslarının ihale tarihindeki gerçek değerini ortaya koymak için yapılır. Yüksek enflasyon dönemlerinde, güncelleme yapılmadan sunulan eski yıl ciroları yeterlik kriterini karşılamakta zorlanabilir.
            </p>
          </div>
        </section>

        {/* Hangi Yıllar Geçerli */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="hangi-yillar-gecerli">Hangi Yılların Cirosu Geçerlidir?</h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              İhalelerde, ihale ilan tarihinden önceki son <strong>5 yılın</strong> ciro belgeleri sunulabilir. İstekliler, bu 5 yıllık dönemden istedikleri yılı veya yılları seçebilir.
            </p>
          </div>
          <div className="mt-4 rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-3">2026 Yılında Yapılan İhaleler İçin Geçerli Ciro Yılları</h3>
            <div className="grid grid-cols-5 gap-2 text-center">
              {[2021, 2022, 2023, 2024, 2025].map((year) => (
                <div key={year} className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-lg font-bold">{year}</p>
                  <p className="text-xs text-muted-foreground">Geçerli</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Yılsonunu beklemeden, cari yılın (2026) bilanço değerleri henüz kesinleşmediğinden, genellikle bir önceki yıla kadar olan cirolar sunulabilir.
            </p>
          </div>
        </section>

        {/* Formül */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="guncelleme-formulu">Ciro Güncelleme Formülü</h2>
          <div className="rounded-xl border bg-card p-6">
            <div className="rounded bg-muted p-4 text-center mb-4">
              <code className="text-lg font-mono">
                Güncel Ciro = Ciro Tutarı &times; (Pn / Po)
              </code>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <span className="font-semibold min-w-[100px]">Ciro Tutarı</span>
                <span className="text-muted-foreground">Seçilen yılın toplam cirosu veya ihale konusu iş cirosu</span>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold min-w-[100px]">Pn</span>
                <span className="text-muted-foreground">İhale ilan tarihinin bulunduğu aydan bir önceki ayın Yİ-ÜFE endeksi</span>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold min-w-[100px]">Po</span>
                <span className="text-muted-foreground">Cironun ait olduğu yılın Haziran ayı Yİ-ÜFE endeksi</span>
              </div>
            </div>
          </div>
        </section>

        {/* Örnek Hesaplama */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="ornek-hesaplama">Örnek Ciro Güncelleme Hesaplaması</h2>
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="font-semibold text-sm mb-1">Veriler</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>2022 yılı toplam ciro: 12.000.000 TL</li>
                <li>İhale ilan tarihi: Şubat 2026</li>
                <li>2022 Haziran Yİ-ÜFE: 1.281,83 (örnek)</li>
                <li>2026 Ocak Yİ-ÜFE: 3.198,67</li>
              </ul>
            </div>
            <div className="rounded-lg border p-4 bg-primary/10 border-primary/20">
              <p className="font-semibold text-sm mb-1">Hesaplama</p>
              <p className="text-sm">
                Güncel Ciro = 12.000.000 &times; (3.198,67 / 1.281,83) = 12.000.000 &times; 2,4955 = <strong>29.946.000 TL</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                2022 yılında 12 milyon TL olan ciro, 2026 değerleriyle yaklaşık 30 milyon TL&apos;ye güncellenmiştir.
              </p>
            </div>
          </div>
        </section>

        {/* Önemli Notlar */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="onemli-notlar">Önemli Notlar</h2>
          <div className="space-y-3">
            <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4 dark:bg-amber-950/20">
              <p className="text-sm"><strong>Toplam Ciro vs İhale Konusu İş Cirosu:</strong> İdari şartnamede hangi ciro türünün istendiğini kontrol edin. Toplam ciro isteniyorsa, yıllık gelir tablosundaki net satışlar toplamı kullanılır. İhale konusu iş cirosu isteniyorsa, sadece benzer işlere ait ciro dikkate alınır.</p>
            </div>
            <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4 dark:bg-amber-950/20">
              <p className="text-sm"><strong>Birden Fazla Yıl:</strong> Birden fazla yılın cirosunu sunuyorsanız, her yılın cirosu kendi yılının Haziran Yİ-ÜFE endeksi ile ayrı ayrı güncellenir ve güncellenmiş tutarlar toplanır.</p>
            </div>
            <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4 dark:bg-amber-950/20">
              <p className="text-sm"><strong>Ortalama Ciro:</strong> İdari şartnamede yıllık ortalama ciro isteniyorsa, sunulan tüm yılların güncellenmiş ciro toplamı, yıl sayısına bölünerek ortalama elde edilir.</p>
            </div>
          </div>
        </section>

        {/* İlgili KİK Kararları */}
        {ciroKararlar.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4" id="ilgili-kararlar">İlgili KİK Kararları</h2>
            <div className="space-y-3">
              {ciroKararlar.map((d) => (
                <div key={d.id} className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                  <Link href={`/kararlar/${d.id}`} className="font-semibold text-primary hover:underline">{d.decisionNo}</Link>
                  <p className="text-sm text-muted-foreground mt-1">{d.subject?.substring(0, 120)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* İlgili Kavramlar */}
        {sozlukTerimleri.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4" id="ilgili-kavramlar">İlgili Kavramlar</h2>
            <div className="flex flex-wrap gap-2">
              {sozlukTerimleri.map((t) => (
                <Link key={t.slug} href={`/sozluk/${t.slug}`} className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
                  {t.term}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-6" id="sikca-sorulan-sorular">Sıkça Sorulan Sorular</h2>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <details key={i} className="group rounded-lg border p-4">
                <summary className="flex cursor-pointer items-center justify-between font-medium">
                  {item.q}
                  <span className="ml-2 transition-transform group-open:rotate-180">&#9660;</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Internal Links */}
        <section className="rounded-xl border bg-muted/30 p-6">
          <h2 className="text-lg font-semibold mb-4">İlgili Sayfalar</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/yi-ufe-endeksi" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">Yİ-ÜFE Endeksi</p>
              <p className="text-sm text-muted-foreground">Aylık güncel endeks tablosu</p>
            </Link>
            <Link href="/is-deneyim-belgesi-guncelleme" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">İş Deneyim Belgesi Güncelleme</p>
              <p className="text-sm text-muted-foreground">Yİ-ÜFE ile belge güncelleme</p>
            </Link>
            <Link href="/asiri-dusuk-teklif-savunma-ornegi" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">Aşırı Düşük Teklif Savunma</p>
              <p className="text-sm text-muted-foreground">Dilekçe şablonu ve örnekler</p>
            </Link>
            <Link href="/hesaplamalar" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">Tüm Hesaplama Araçları</p>
              <p className="text-sm text-muted-foreground">16 farklı ihale hesaplama aracı</p>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
