import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "İş Deneyim Belgesi Güncelleme Hesaplama 2026 | KikBul",
  description:
    "İş deneyim belgesi güncelleme hesaplama aracı. Belge tarihi ve tutarını girin, Yİ-ÜFE endeksi ile güncel tutarı hesaplayın.",
  alternates: { canonical: "https://kikbul.com/is-deneyim-belgesi-guncelleme" },
  openGraph: {
    title: "İş Deneyim Belgesi Güncelleme Hesaplama 2026 | KikBul",
    description:
      "İş deneyim belgesi güncelleme hesaplama aracı. Yİ-ÜFE endeksi ile güncel tutarı hesaplayın.",
    type: "website",
    locale: "tr_TR",
    siteName: "KikBul",
  },
};

export const revalidate = 86400;

async function getPageData() {
  const [isDeneyimKararlar, sozlukTerimleri, sonEndeks] = await Promise.all([
    prisma.boardDecision.findMany({
      where: { subject: { contains: "iş deneyim", mode: "insensitive" } },
      orderBy: { decisionDate: "desc" },
      take: 5,
      select: { id: true, decisionNo: true, subject: true, decisionDate: true },
    }),
    prisma.glossaryTerm.findMany({
      where: {
        OR: [
          { term: { contains: "iş deneyim", mode: "insensitive" } },
          { term: { contains: "yi-üfe", mode: "insensitive" } },
        ],
      },
      take: 6,
      select: { slug: true, term: true },
    }),
    prisma.macroPriceIndex.findFirst({
      where: { code: "YIUFE" },
      orderBy: { period: "desc" },
    }),
  ]);

  return { isDeneyimKararlar, sozlukTerimleri, sonEndeks };
}

const faqItems = [
  {
    q: "İş deneyim belgesi güncelleme nedir?",
    a: "İş deneyim belgesi güncelleme, ihalelerde sunulan iş deneyim belgesinin tutarının, belgenin düzenlendiği tarihten ihale tarihine kadar geçen süredeki fiyat artışlarını yansıtmak amacıyla Yİ-ÜFE endeksi ile güncellenmesidir.",
  },
  {
    q: "İş deneyim belgesi güncelleme formülü nedir?",
    a: "Güncellenmiş Tutar = Belge Tutarı x (İhale Ayından Bir Önceki Ayın Yİ-ÜFE Endeksi / Belge Yılı Haziran Ayı Yİ-ÜFE Endeksi). Bu formül, Yapım İşleri İhaleleri Uygulama Yönetmeliğinin ilgili maddelerinde belirtilmektedir.",
  },
  {
    q: "Hangi dönemin Yİ-ÜFE endeksi kullanılır?",
    a: "Pay (üst değer) olarak ihale ilan tarihinin bulunduğu aydan bir önceki ayın Yİ-ÜFE endeksi, payda (alt değer) olarak ise belge tutarına esas yılın Haziran ayı Yİ-ÜFE endeksi kullanılır.",
  },
  {
    q: "İş deneyim belgesi ne kadar süre geçerlidir?",
    a: "İş deneyim belgeleri, belge konusu işin geçici kabulü veya kabul tarihinden itibaren ilk 15 yıl süresince tam tutarıyla, sonraki 15 yılda ise %50 oranında dikkate alınır. Toplam 30 yıl sonunda geçerliliğini yitirir.",
  },
  {
    q: "Ortaklık oranına göre güncelleme nasıl yapılır?",
    a: "İş ortaklıklarında, ortaklık oranına isabet eden iş deneyim tutarı üzerinden güncelleme yapılır. Pilot ortağın ve diğer ortakların payları ayrı ayrı güncellenir.",
  },
];

export default async function IsDeneyimGuncellemePage() {
  const { isDeneyimKararlar, sozlukTerimleri, sonEndeks } = await getPageData();

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "KikBul İş Deneyim Belgesi Güncelleme Hesaplama Aracı",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
    description: "İş deneyim belgesi güncelleme hesaplama aracı. Yİ-ÜFE endeksi ile güncel tutarı hesaplayın.",
    url: "https://kikbul.com/is-deneyim-belgesi-guncelleme",
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
      { "@type": "ListItem", position: 3, name: "İş Deneyim Belgesi Güncelleme", item: "https://kikbul.com/is-deneyim-belgesi-guncelleme" },
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
            <li className="before:content-['/'] before:mx-1.5 font-medium text-foreground">İş Deneyim Belgesi Güncelleme</li>
          </ol>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          İş Deneyim Belgesi Güncelleme Hesaplama 2026
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          İş deneyim belgesi tutarınızı Yİ-ÜFE endeksi ile güncelleyin. Belge tarihi ve tutarını girerek ihale tarihine göre güncel tutarı hesaplayın.
        </p>

        {/* Calculator CTA */}
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-8 mb-10 text-center">
          <h2 className="text-xl font-bold mb-3">Online Güncelleme Hesaplama Aracı</h2>
          <p className="text-muted-foreground mb-2">
            Belge yılını, tutarını ve ihale tarihini girerek güncellenmiş iş deneyim belge tutarını hesaplayın.
          </p>
          {sonEndeks && (
            <p className="text-sm text-muted-foreground mb-4">
              Son Yİ-ÜFE Endeks Değeri: <strong>{Number(sonEndeks.value).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</strong> ({sonEndeks.period})
            </p>
          )}
          <Link href="/hesaplamalar" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Hesaplamaya Başla &rarr;
          </Link>
        </div>

        {/* Formül Açıklaması */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="guncelleme-formulu">Güncelleme Formülü</h2>
          <div className="rounded-xl border bg-card p-6">
            <div className="rounded bg-muted p-4 text-center mb-4">
              <code className="text-lg font-mono">
                Güncel Tutar = Belge Tutarı &times; (Pn / Po)
              </code>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <span className="font-semibold min-w-[100px]">Belge Tutarı</span>
                <span className="text-muted-foreground">İş deneyim belgesinde yazılı tutar (KDV hariç)</span>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold min-w-[100px]">Pn</span>
                <span className="text-muted-foreground">İhale ilan tarihinin bulunduğu aydan bir önceki ayın Yİ-ÜFE endeksi</span>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold min-w-[100px]">Po</span>
                <span className="text-muted-foreground">İş deneyim belgesinin tutarına esas yılın Haziran ayı Yİ-ÜFE endeksi</span>
              </div>
            </div>
          </div>
        </section>

        {/* Adım Adım Örnek */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="ornek-hesaplama">Adım Adım Örnek Hesaplama</h2>
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="font-semibold text-sm mb-1">Veriler</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Belge tutarı: 5.000.000 TL</li>
                <li>Belge yılı (geçici kabul): 2020</li>
                <li>İhale ilan tarihi: Mart 2026</li>
              </ul>
            </div>
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="font-semibold text-sm mb-1">Adım 1: Po değerini bulun</p>
              <p className="text-sm text-muted-foreground">
                2020 yılı Haziran ayı Yİ-ÜFE endeksi: <strong>538,98</strong> (örnek değer)
              </p>
            </div>
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="font-semibold text-sm mb-1">Adım 2: Pn değerini bulun</p>
              <p className="text-sm text-muted-foreground">
                İhale ilan tarihi Mart 2026, bir önceki ay Şubat 2026 Yİ-ÜFE endeksi: <strong>3.284,12</strong>
              </p>
            </div>
            <div className="rounded-lg border p-4 bg-primary/10 border-primary/20">
              <p className="font-semibold text-sm mb-1">Adım 3: Hesaplama</p>
              <p className="text-sm">
                Güncel Tutar = 5.000.000 &times; (3.284,12 / 538,98) = 5.000.000 &times; 6,0932 = <strong>30.466.000 TL</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Belge tutarı yaklaşık 6 kat artarak 30.466.000 TL olarak güncellenmiştir.
              </p>
            </div>
          </div>
        </section>

        {/* Hangi Dönemler */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="hangi-donemler">Hangi Dönemlerin Endeksi Kullanılır?</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold">Belge Türü</th>
                  <th className="text-left p-3 font-semibold">Po (Baz Endeks)</th>
                  <th className="text-left p-3 font-semibold">Pn (Güncel Endeks)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3">Yapım İşi Deneyim Belgesi</td>
                  <td className="p-3 text-muted-foreground">Belge tutarına esas yılın Haziran ayı Yİ-ÜFE</td>
                  <td className="p-3 text-muted-foreground">İhale ilan ayından bir önceki ayın Yİ-ÜFE</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Hizmet Alımı Deneyim Belgesi</td>
                  <td className="p-3 text-muted-foreground">Sözleşme bedelinin ödeme tarihindeki Yİ-ÜFE</td>
                  <td className="p-3 text-muted-foreground">İhale ilan ayından bir önceki ayın Yİ-ÜFE</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Mal Alımı Deneyim Belgesi</td>
                  <td className="p-3 text-muted-foreground">Faturanın düzenlendiği ayın Yİ-ÜFE</td>
                  <td className="p-3 text-muted-foreground">İhale ilan ayından bir önceki ayın Yİ-ÜFE</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* İlgili KİK Kararları */}
        {isDeneyimKararlar.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4" id="ilgili-kararlar">İlgili KİK Kararları</h2>
            <div className="space-y-3">
              {isDeneyimKararlar.map((d) => (
                <div key={d.id} className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                  <Link href={`/kararlar/${d.id}`} className="font-semibold text-primary hover:underline">{d.decisionNo}</Link>
                  <p className="text-sm text-muted-foreground mt-1">{d.subject?.substring(0, 120)}</p>
                  {d.decisionDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Karar Tarihi: {new Date(d.decisionDate).toLocaleDateString("tr-TR")}
                    </p>
                  )}
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
            <Link href="/ciro-guncelleme" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">Ciro Güncelleme</p>
              <p className="text-sm text-muted-foreground">Yİ-ÜFE ile ciro güncelleme</p>
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
