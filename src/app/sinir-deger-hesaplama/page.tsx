import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Sınır Değer Hesaplama 2026 | Ücretsiz Online Araç | KikBul",
  description:
    "İhale sınır değer hesaplama aracı. Teklif fiyatlarını girin, R katsayısı ile sınır değeri otomatik hesaplayın. 2026 güncel formül.",
  alternates: { canonical: "https://kikbul.com/sinir-deger-hesaplama" },
  openGraph: {
    title: "Sınır Değer Hesaplama 2026 | Ücretsiz Online Araç | KikBul",
    description:
      "İhale sınır değer hesaplama aracı. Teklif fiyatlarını girin, R katsayısı ile sınır değeri otomatik hesaplayın.",
    type: "website",
    locale: "tr_TR",
    siteName: "KikBul",
  },
};

export const revalidate = 86400;

async function getPageData() {
  const [sinirDegerKararlar, sozlukTerimleri] = await Promise.all([
    prisma.boardDecision.findMany({
      where: { subject: { contains: "sınır değer", mode: "insensitive" } },
      orderBy: { decisionDate: "desc" },
      take: 5,
      select: { id: true, decisionNo: true, subject: true, decisionDate: true },
    }),
    prisma.glossaryTerm.findMany({
      where: {
        OR: [
          { term: { contains: "sınır değer", mode: "insensitive" } },
          { term: { contains: "aşırı düşük", mode: "insensitive" } },
        ],
      },
      take: 6,
      select: { slug: true, term: true },
    }),
  ]);

  return { sinirDegerKararlar, sozlukTerimleri };
}

const faqItems = [
  {
    q: "Sınır değer nedir?",
    a: "Sınır değer, ihalelerde aşırı düşük teklif sorgulamasının yapılıp yapılmayacağını belirleyen eşik tutardır. Sınır değerin altında kalan teklif sahiplerine aşırı düşük teklif açıklaması sorulur.",
  },
  {
    q: "Sınır değer nasıl hesaplanır?",
    a: "Geçerli tekliflerin aritmetik ortalaması hesaplanır, ortalamanın altındaki tekliflerin ortalaması alınır ve bu değer R katsayısı ile çarpılarak sınır değer bulunur. R katsayısı her yıl KİK tarafından belirlenir.",
  },
  {
    q: "2026 yılı R katsayısı kaçtır?",
    a: "R katsayısı ihale türüne göre değişir. Yapım işleri ve hizmet alımları için farklı katsayılar uygulanır. Güncel katsayılar KİK Düzenleyici Kurul kararları ile yayımlanmaktadır.",
  },
  {
    q: "Hangi ihalelerde sınır değer hesaplanır?",
    a: "Açık ihale usulü ve belli istekliler arasında ihale usulü ile yapılan yapım işleri, hizmet alımları ve mal alımı ihalelerinde sınır değer hesaplanır.",
  },
  {
    q: "Sınır değerin altında teklif verirsem ne olur?",
    a: "Sınır değerin altında teklif vermeniz halinde idarece aşırı düşük teklif sorgulaması yapılır. Yeterli açıklama sunmanız durumunda teklifiniz kabul edilir, aksi halde reddedilir.",
  },
  {
    q: "Personel çalıştırılmasına dayalı ihalelerde sınır değer farklı mıdır?",
    a: "Evet, personel çalıştırılmasına dayalı hizmet alımlarında sınır değer asgari işçilik maliyeti üzerinden hesaplanır ve diğer ihalelerden farklı bir yöntem uygulanır.",
  },
];

export default async function SinirDegerHesaplamaPage() {
  const { sinirDegerKararlar, sozlukTerimleri } = await getPageData();

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "KikBul Sınır Değer Hesaplama Aracı",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
    description: "İhale sınır değer hesaplama aracı. Teklif fiyatlarını girin, R katsayısı ile sınır değeri otomatik hesaplayın.",
    url: "https://kikbul.com/sinir-deger-hesaplama",
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
      { "@type": "ListItem", position: 3, name: "Sınır Değer Hesaplama", item: "https://kikbul.com/sinir-deger-hesaplama" },
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
            <li className="before:content-['/'] before:mx-1.5 font-medium text-foreground">Sınır Değer Hesaplama</li>
          </ol>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          Sınır Değer Hesaplama 2026
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          4734 sayılı Kamu İhale Kanunu kapsamında sınır değer hesaplama aracı. Teklif fiyatlarını girin, sınır değeri otomatik hesaplayın.
        </p>

        {/* Calculator CTA */}
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-8 mb-10 text-center">
          <h2 className="text-xl font-bold mb-3">Online Sınır Değer Hesaplama Aracı</h2>
          <p className="text-muted-foreground mb-4">
            Teklif fiyatlarını girerek sınır değeri hızlıca hesaplayın. Yapım işleri ve hizmet alımları için ayrı hesaplama yapabilirsiniz.
          </p>
          <Link href="/hesaplamalar?tab=sinir" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Hesaplamaya Başla &rarr;
          </Link>
        </div>

        {/* Sınır Değer Nedir? */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="sinir-deger-nedir">Sınır Değer Nedir?</h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              Sınır değer, kamu ihalelerinde aşırı düşük teklif sorgulamasının uygulanıp uygulanmayacağını belirleyen kritik bir eşik tutardır. 4734 sayılı Kamu İhale Kanununun 38. maddesi kapsamında, ihale komisyonu tarafından geçerli teklifler üzerinden hesaplanan bu değer, tekliflerin ekonomik sürdürülebilirliğinin kontrolü için kullanılır.
            </p>
            <p>
              Sınır değerin altında teklif sunan isteklilere, tekliflerinin bileşenlerini açıklamaları için yazılı bildirim yapılır. Bu mekanizma, ihalelerde dumpinge karşı bir koruma sağlarken, aynı zamanda rekabetçi fiyatlandırmaya da olanak tanır.
            </p>
          </div>
        </section>

        {/* Formül Açıklaması */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="sinir-deger-formulu">Sınır Değer Hesaplama Formülü</h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>Yapım işleri ve hizmet alımlarında sınır değer aşağıdaki adımlarla hesaplanır:</p>
          </div>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="font-semibold text-sm mb-1">Adım 1: Aritmetik Ortalama</p>
              <p className="text-sm text-muted-foreground">Geçerli tüm tekliflerin aritmetik ortalaması (A) hesaplanır.</p>
              <code className="block mt-2 text-sm bg-muted p-2 rounded">A = (T1 + T2 + ... + Tn) / n</code>
            </div>
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="font-semibold text-sm mb-1">Adım 2: Alt Ortalama</p>
              <p className="text-sm text-muted-foreground">A değerinin altında kalan tekliflerin ortalaması (B) hesaplanır.</p>
              <code className="block mt-2 text-sm bg-muted p-2 rounded">B = (A altındaki tekliflerin toplamı) / (A altındaki teklif sayısı)</code>
            </div>
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="font-semibold text-sm mb-1">Adım 3: Sınır Değer</p>
              <p className="text-sm text-muted-foreground">B değeri, R katsayısı ile çarpılarak sınır değer (SD) elde edilir.</p>
              <code className="block mt-2 text-sm bg-muted p-2 rounded">SD = B x R</code>
            </div>
          </div>
        </section>

        {/* R Katsayısı */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="r-katsayisi">R Katsayısı Tablosu</h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              R katsayısı, KİK Düzenleyici Kurul Kararları ile her yıl belirlenir. Yapım işleri ve hizmet alımları için ayrı katsayılar uygulanır. Aşağıda son yıllara ait R katsayıları yer almaktadır:
            </p>
          </div>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold">Yıl</th>
                  <th className="text-left p-3 font-semibold">Karar No</th>
                  <th className="text-left p-3 font-semibold">İhale Türü</th>
                  <th className="text-left p-3 font-semibold">Durum</th>
                </tr>
              </thead>
              <tbody>
                {sinirDegerKararlar.map((d) => (
                  <tr key={d.id} className="border-b">
                    <td className="p-3">{d.decisionDate ? new Date(d.decisionDate).getFullYear() : "-"}</td>
                    <td className="p-3">
                      <Link href={`/kararlar/${d.id}`} className="text-primary hover:underline">{d.decisionNo}</Link>
                    </td>
                    <td className="p-3 text-muted-foreground">{d.subject?.substring(0, 60)}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">Yürürlükte</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Örnek Hesaplama */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="ornek-hesaplama">Örnek Sınır Değer Hesaplaması</h2>
          <div className="rounded-xl border bg-card p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Bir yapım işi ihalesinde 7 geçerli teklif olduğunu varsayalım:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse mb-4">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2">İstekli</th>
                    <th className="text-right p-2">Teklif Tutarı (TL)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2">Firma A</td><td className="text-right p-2">8.500.000</td></tr>
                  <tr className="border-b"><td className="p-2">Firma B</td><td className="text-right p-2">9.200.000</td></tr>
                  <tr className="border-b"><td className="p-2">Firma C</td><td className="text-right p-2">9.800.000</td></tr>
                  <tr className="border-b"><td className="p-2">Firma D</td><td className="text-right p-2">10.100.000</td></tr>
                  <tr className="border-b"><td className="p-2">Firma E</td><td className="text-right p-2">10.500.000</td></tr>
                  <tr className="border-b"><td className="p-2">Firma F</td><td className="text-right p-2">11.200.000</td></tr>
                  <tr className="border-b"><td className="p-2">Firma G</td><td className="text-right p-2">12.000.000</td></tr>
                </tbody>
              </table>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded bg-muted/30 p-3">
                <strong>Adım 1:</strong> A = (8.5M + 9.2M + 9.8M + 10.1M + 10.5M + 11.2M + 12M) / 7 = <strong>10.185.714 TL</strong>
              </div>
              <div className="rounded bg-muted/30 p-3">
                <strong>Adım 2:</strong> A altındaki teklifler: 8.5M, 9.2M, 9.8M, 10.1M &rarr; B = (8.5M + 9.2M + 9.8M + 10.1M) / 4 = <strong>9.400.000 TL</strong>
              </div>
              <div className="rounded bg-primary/10 p-3 border border-primary/20">
                <strong>Adım 3:</strong> SD = 9.400.000 x R (varsayım R = 1,00) = <strong>9.400.000 TL</strong>
                <p className="text-muted-foreground mt-1">Bu durumda 9.400.000 TL altındaki teklifler (Firma A: 8.5M ve Firma B: 9.2M) aşırı düşük sorgulamasına tabi tutulur.</p>
              </div>
            </div>
          </div>
        </section>

        {/* İhale Türlerine Göre */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="ihale-turlerine-gore">İhale Türlerine Göre Sınır Değer</h2>
          <div className="space-y-4">
            <div className="rounded-lg border p-5">
              <h3 className="text-lg font-semibold mb-2">Yapım İşleri</h3>
              <p className="text-sm text-muted-foreground">
                Yapım işlerinde sınır değer, Yapım İşleri İhaleleri Uygulama Yönetmeliğinin 60. maddesi uyarınca hesaplanır. Geçerli teklif sayısı 4 ve üzerinde olduğunda yukarıdaki formül uygulanır. 3 ve altında geçerli teklif olması halinde sınır değer hesaplanmaz ve aşırı düşük sorgulaması idarenin takdirindedir.
              </p>
            </div>
            <div className="rounded-lg border p-5">
              <h3 className="text-lg font-semibold mb-2">Hizmet Alımları</h3>
              <p className="text-sm text-muted-foreground">
                Personel çalıştırılmasına dayalı olmayan hizmet alımlarında yapım işlerine benzer formül kullanılır. Personel çalıştırılmasına dayalı hizmet alımlarında ise sınır değer; asgari işçilik maliyeti + %4 sözleşme giderleri + genel giderler toplamı üzerinden hesaplanır.
              </p>
            </div>
            <div className="rounded-lg border p-5">
              <h3 className="text-lg font-semibold mb-2">Mal Alımları</h3>
              <p className="text-sm text-muted-foreground">
                Mal alımlarında sınır değer hesaplaması yapılıp yapılmayacağı idarenin takdirindedir. İdari şartnamede belirtilmişse yapım işlerine benzer formül uygulanabilir.
              </p>
            </div>
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
            <Link href="/asiri-dusuk-teklif-savunma-ornegi" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">Aşırı Düşük Teklif Savunma Örneği</p>
              <p className="text-sm text-muted-foreground">Dilekçe şablonu ve KİK kararları</p>
            </Link>
            <Link href="/hesaplamalar" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">Tüm Hesaplama Araçları</p>
              <p className="text-sm text-muted-foreground">16 farklı ihale hesaplama aracı</p>
            </Link>
            <Link href="/yi-ufe-endeksi" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">Yİ-ÜFE Endeksi</p>
              <p className="text-sm text-muted-foreground">Aylık güncel endeks tablosu</p>
            </Link>
            <Link href="/kararlar" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">KİK Kararları Arama</p>
              <p className="text-sm text-muted-foreground">97.000+ ihale kararı veritabanı</p>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
