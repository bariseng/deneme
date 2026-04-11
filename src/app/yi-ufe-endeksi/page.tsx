import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Yİ-ÜFE Endeksi 2026 | Aylık Güncel Tablo | KikBul",
  description:
    "Yİ-ÜFE endeks tablosu 2003-2026. Aylık değerler, değişim oranları. Fiyat farkı ve iş deneyim güncelleme hesaplamaları için.",
  alternates: { canonical: "https://kikbul.com/yi-ufe-endeksi" },
  openGraph: {
    title: "Yİ-ÜFE Endeksi 2026 | Aylık Güncel Tablo | KikBul",
    description:
      "Yİ-ÜFE endeks tablosu 2003-2026. Aylık değerler, değişim oranları.",
    type: "website",
    locale: "tr_TR",
    siteName: "KikBul",
  },
};

export const revalidate = 3600; // 1 hour

const MONTH_NAMES = [
  "", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

async function getPageData() {
  const [endeksVerileri, sozlukTerimleri] = await Promise.all([
    prisma.macroPriceIndex.findMany({
      where: { code: "YIUFE" },
      orderBy: { period: "desc" },
      take: 36,
    }),
    prisma.glossaryTerm.findMany({
      where: {
        OR: [
          { term: { contains: "yi-üfe", mode: "insensitive" } },
          { term: { contains: "endeks", mode: "insensitive" } },
          { term: { contains: "fiyat farkı", mode: "insensitive" } },
          { term: { contains: "iş deneyim", mode: "insensitive" } },
        ],
      },
      take: 8,
      select: { slug: true, term: true },
    }),
  ]);

  return { endeksVerileri, sozlukTerimleri };
}

const faqItems = [
  {
    q: "Yİ-ÜFE endeksi nedir?",
    a: "Yİ-ÜFE (Yurt İçi Üretici Fiyat Endeksi), Türkiye İstatistik Kurumu (TÜİK) tarafından aylık olarak yayımlanan, yurt içinde üretilen ve yurt içinde satışa konu olan ürünlerin üretici fiyatlarındaki değişimi ölçen bir endekstir.",
  },
  {
    q: "Yİ-ÜFE endeksi ihalelerde ne için kullanılır?",
    a: "Yİ-ÜFE endeksi kamu ihalelerinde üç temel amaçla kullanılır: Fiyat farkı hesaplama, iş deneyim belgesi güncelleme ve ciro güncelleme. 4734 ve 4735 sayılı Kanunlar kapsamında bu hesaplamalarda Yİ-ÜFE endeks değerleri referans alınır.",
  },
  {
    q: "Yİ-ÜFE endeksi ne zaman yayımlanır?",
    a: "Yİ-ÜFE endeksi, TÜİK tarafından her ayın 3. iş günü itibarıyla bir önceki aya ait değerler olarak yayımlanır. Endeks değerleri 2003=100 baz yılı üzerinden hesaplanmaktadır.",
  },
  {
    q: "İş deneyim belgesi güncellemede hangi endeks kullanılır?",
    a: "İş deneyim belgesi güncellemede, belge tutarının ait olduğu yılın Haziran ayı Yİ-ÜFE endeksi ile ihale ilan tarihinin bulunduğu aydan bir önceki ayın Yİ-ÜFE endeksi kullanılır.",
  },
  {
    q: "Fiyat farkı hesaplamasında Yİ-ÜFE nasıl kullanılır?",
    a: "Fiyat farkı hesaplamasında, uygulama ayına ait Yİ-ÜFE endeksi ile baz ayın (ihale tarihinin bulunduğu aydan bir önceki ay) Yİ-ÜFE endeksi oranlanarak fiyat farkı katsayısı (Pn/Po) bulunur.",
  },
];

export default async function YiUfeEndeksiPage() {
  const { endeksVerileri, sozlukTerimleri } = await getPageData();

  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Yİ-ÜFE Endeks Tablosu",
    description: "Yurt İçi Üretici Fiyat Endeksi (Yİ-ÜFE) aylık değerleri, 2003 baz yılı üzerinden.",
    url: "https://kikbul.com/yi-ufe-endeksi",
    temporalCoverage: "2003/..",
    creator: { "@type": "Organization", name: "TÜİK" },
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "text/html",
      contentUrl: "https://kikbul.com/yi-ufe-endeksi",
    },
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
      { "@type": "ListItem", position: 2, name: "Endeksler", item: "https://kikbul.com/endeksler" },
      { "@type": "ListItem", position: 3, name: "Yİ-ÜFE Endeksi", item: "https://kikbul.com/yi-ufe-endeksi" },
    ],
  };

  // Parse period "YYYY-MM" into year/month for display
  const enriched = endeksVerileri.map((item) => {
    const [y, m] = item.period.split("-").map(Number);
    return { ...item, year: y, month: m, monthlyRate: item.changeMonthly ?? 0, yearlyRate: item.changeYearly ?? 0 };
  });

  // Group by year for display
  const byYear = enriched.reduce<Record<number, typeof enriched>>((acc, item) => {
    if (!acc[item.year]) acc[item.year] = [];
    acc[item.year].push(item);
    return acc;
  }, {});

  const sortedYears = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <ol className="flex items-center gap-1.5">
            <li><Link href="/" className="hover:text-foreground transition-colors">Ana Sayfa</Link></li>
            <li className="before:content-['/'] before:mx-1.5">
              <Link href="/endeksler" className="hover:text-foreground transition-colors">Endeksler</Link>
            </li>
            <li className="before:content-['/'] before:mx-1.5 font-medium text-foreground">Yİ-ÜFE Endeksi</li>
          </ol>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          Yİ-ÜFE Endeksi 2026 &mdash; Aylık Güncel Tablo
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Yurt İçi Üretici Fiyat Endeksi (Yİ-ÜFE) aylık değerleri. Fiyat farkı, iş deneyim belgesi güncelleme ve ciro güncelleme hesaplamalarında kullanılır.
        </p>

        {/* Son Değer Kartı */}
        {enriched.length > 0 && (
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 mb-10">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Son Endeks Değeri</p>
                <p className="text-3xl font-bold">{Number(enriched[0].value).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
                <p className="text-sm text-muted-foreground">
                  {MONTH_NAMES[enriched[0].month]} {enriched[0].year}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aylık Değişim</p>
                <p className={`text-3xl font-bold ${Number(enriched[0].monthlyRate) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                  %{Number(enriched[0].monthlyRate).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Yıllık Değişim</p>
                <p className={`text-3xl font-bold ${Number(enriched[0].yearlyRate) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                  %{Number(enriched[0].yearlyRate).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Endeks Tablosu */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="endeks-tablosu">Yİ-ÜFE Endeks Tablosu (Son 36 Ay)</h2>
          {sortedYears.map((year) => (
            <div key={year} className="mb-6">
              <h3 className="text-lg font-semibold mb-2">{year}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-semibold">Ay</th>
                      <th className="text-right p-2 font-semibold">Endeks Değeri</th>
                      <th className="text-right p-2 font-semibold">Aylık Değişim (%)</th>
                      <th className="text-right p-2 font-semibold">Yıllık Değişim (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byYear[year]
                      .sort((a, b) => b.month - a.month)
                      .map((item) => (
                        <tr key={`${item.year}-${item.month}`} className="border-b hover:bg-muted/20">
                          <td className="p-2">{MONTH_NAMES[item.month]}</td>
                          <td className="text-right p-2 font-mono">{Number(item.value).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                          <td className={`text-right p-2 font-mono ${Number(item.monthlyRate) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                            {Number(item.monthlyRate).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`text-right p-2 font-mono ${Number(item.yearlyRate) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                            {Number(item.yearlyRate).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <div className="text-center mt-4">
            <Link href="/endeksler" className="text-primary hover:underline text-sm font-medium">
              Tüm Yılların Endeks Verilerini Görüntüle &rarr;
            </Link>
          </div>
        </section>

        {/* Yİ-ÜFE Nedir? */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="yi-ufe-nedir">Yİ-ÜFE Nedir?</h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              Yurt İçi Üretici Fiyat Endeksi (Yİ-ÜFE), Türkiye İstatistik Kurumu (TÜİK) tarafından aylık olarak hesaplanan ve yayımlanan bir fiyat endeksidir. Bu endeks, Türkiye&apos;de üretilerek yurt içi piyasaya sunulan ürünlerin üretici fiyatlarındaki değişimi ölçer.
            </p>
            <p>
              Yİ-ÜFE, 2003 yılını baz yıl (2003=100) olarak kullanmaktadır. Endeks kapsamında tarım, madencilik, imalat sanayi, enerji ve su sektörleri yer almaktadır. Kamu ihalelerinde fiyat farkı hesaplaması, iş deneyim belgesi güncelleme ve ciro güncelleme işlemlerinde temel referans endeks olarak kullanılır.
            </p>
          </div>
        </section>

        {/* Fiyat Farkı Hesabında Kullanımı */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="fiyat-farki-hesabi">Fiyat Farkı Hesabında Yİ-ÜFE Kullanımı</h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              4735 sayılı Kamu İhale Sözleşmeleri Kanununun 8. maddesi ve Fiyat Farkına İlişkin Esaslar uyarınca, kamu ihale sözleşmelerinde fiyat farkı hesaplamasında Yİ-ÜFE endeksi kullanılır.
            </p>
            <p>
              Fiyat farkı formülünde temel endeks (P0), ihale tarihinin bulunduğu aydan bir önceki ayın Yİ-ÜFE değeridir. Uygulama endeksi (Pn) ise ilgili uygulama ayının Yİ-ÜFE değeridir. Fiyat farkı katsayısı F = Pn/P0 formülü ile hesaplanır.
            </p>
          </div>
          <div className="not-prose mt-4 flex flex-wrap gap-3">
            <Link href="/hesaplamalar" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Fiyat Farkı Hesaplama Aracı &rarr;
            </Link>
            <Link href="/is-deneyim-belgesi-guncelleme" className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              İş Deneyim Güncelleme &rarr;
            </Link>
            <Link href="/ciro-guncelleme" className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Ciro Güncelleme &rarr;
            </Link>
          </div>
        </section>

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
            <Link href="/is-deneyim-belgesi-guncelleme" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">İş Deneyim Belgesi Güncelleme</p>
              <p className="text-sm text-muted-foreground">Yİ-ÜFE ile belge tutarı güncelleme</p>
            </Link>
            <Link href="/ciro-guncelleme" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">Ciro Güncelleme</p>
              <p className="text-sm text-muted-foreground">Yİ-ÜFE ile ciro tutarı güncelleme</p>
            </Link>
            <Link href="/hesaplamalar" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">Tüm Hesaplama Araçları</p>
              <p className="text-sm text-muted-foreground">16 farklı ihale hesaplama aracı</p>
            </Link>
            <Link href="/endeksler" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">Tüm Endeksler</p>
              <p className="text-sm text-muted-foreground">Yİ-ÜFE, TÜFE ve diğer endeksler</p>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
