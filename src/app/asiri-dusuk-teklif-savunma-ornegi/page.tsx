import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Aşırı Düşük Teklif Savunma Örneği 2026 | Şablon + KİK Kararları | KikBul",
  description:
    "Aşırı düşük teklif savunma dilekçesi şablonu ve gerçek KİK kararlarından kabul/red örnekleri. Maliyet bileşeni bazında açıklama rehberi.",
  alternates: { canonical: "https://kikbul.com/asiri-dusuk-teklif-savunma-ornegi" },
  openGraph: {
    title: "Aşırı Düşük Teklif Savunma Örneği 2026 | Şablon + KİK Kararları | KikBul",
    description:
      "Aşırı düşük teklif savunma dilekçesi şablonu ve gerçek KİK kararlarından kabul/red örnekleri.",
    type: "article",
    locale: "tr_TR",
    siteName: "KikBul",
  },
};

export const revalidate = 86400;

async function getPageData() {
  const [asiriDusukKararlar, sinirDegerKararlar, isDeneyimKararlar, sozlukTerimleri] =
    await Promise.all([
      prisma.boardDecision.findMany({
        where: { subject: { contains: "aşırı düşük", mode: "insensitive" } },
        orderBy: { decisionDate: "desc" },
        take: 10,
        select: { id: true, decisionNo: true, subject: true, decisionDate: true },
      }),
      prisma.boardDecision.findMany({
        where: { subject: { contains: "sınır değer", mode: "insensitive" } },
        orderBy: { decisionDate: "desc" },
        take: 5,
        select: { id: true, decisionNo: true, subject: true, decisionDate: true },
      }),
      prisma.boardDecision.findMany({
        where: { subject: { contains: "iş deneyim", mode: "insensitive" } },
        orderBy: { decisionDate: "desc" },
        take: 5,
        select: { id: true, decisionNo: true, subject: true, decisionDate: true },
      }),
      prisma.glossaryTerm.findMany({
        where: {
          OR: [
            { term: { contains: "aşırı düşük", mode: "insensitive" } },
            { term: { contains: "sınır değer", mode: "insensitive" } },
            { term: { contains: "iş deneyim", mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { slug: true, term: true },
      }),
    ]);

  return { asiriDusukKararlar, sinirDegerKararlar, isDeneyimKararlar, sozlukTerimleri };
}

const faqItems = [
  {
    q: "Aşırı düşük teklif savunması için kaç gün süre verilir?",
    a: "İhale komisyonu tarafından belirlenen süre genellikle 3-5 iş günü arasındadır. Ancak istekliler ek süre talep edebilir. Sürenin yetmemesi durumunda yazılı olarak ek süre istenmesi önerilir.",
  },
  {
    q: "Hangi ihalelerde aşırı düşük teklif sorgulaması yapılır?",
    a: "4734 sayılı Kanunun 38. maddesi gereğince, sınır değerin altında teklif veren isteklilere aşırı düşük teklif sorgulaması yapılır. Ancak KİK tarafından belirlenen bazı hizmet alımlarında sorgulama yapılmaz.",
  },
  {
    q: "Aşırı düşük açıklama yaparken hangi belgeler sunulmalıdır?",
    a: "Proforma fatura, teklif alma yazısı, maliyet/satış tutarı tespit tutanağı (EK-O.5, EK-O.6, EK-O.7), kamu kurum ve kuruluşlarının tarifelerine dayalı açıklamalar, resmi verilere dayalı hesaplamalar sunulabilir.",
  },
  {
    q: "Proforma fatura ile açıklama yapılabilir mi?",
    a: "Evet, proforma fatura ile açıklama yapılabilir. Ancak proforma faturanın EK-O.7 formatında düzenlenmesi, fiyatın piyasa koşullarıyla uyumlu olması ve meslek mensubu onayı taşıması gerekir.",
  },
  {
    q: "Aşırı düşük teklif açıklaması reddedilirse ne yapılabilir?",
    a: "Açıklamanın reddedilmesi halinde 10 gün içinde KİK'e itirazen şikâyet başvurusu yapılabilir. Şikâyet dilekçesinde red gerekçelerine detaylı cevaplar verilmeli ve ek belgeler sunulmalıdır.",
  },
  {
    q: "İşçilik maliyetinde asgari ücretin altında açıklama yapılabilir mi?",
    a: "Hayır, işçilik maliyetlerinde asgari ücretin altında bir bedel öngörülemez. Asgari ücret, sigorta primleri, yemek, yol gibi giderler dahil edilerek hesaplanmalıdır.",
  },
  {
    q: "Alt yüklenici fiyatları ile açıklama yapılabilir mi?",
    a: "Evet, alt yüklenici ile yapılması düşünülen işlerde alt yüklenici fiyat teklifleri sunulabilir. Ancak bu tekliflerin de EK-O.8 formatında düzenlenmesi gerekir.",
  },
  {
    q: "Amortisman giderleri açıklamaya dahil edilmeli midir?",
    a: "Evet, özellikle makine-ekipman gerektiren işlerde amortisman giderleri, bakım-onarım maliyetleri ve yakıt giderleri ayrıntılı olarak açıklanmalıdır.",
  },
];

export default async function AsiriDusukSavunmaPage() {
  const { asiriDusukKararlar, sinirDegerKararlar, isDeneyimKararlar, sozlukTerimleri } =
    await getPageData();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Aşırı Düşük Teklif Savunma Örneği 2026",
    description:
      "Aşırı düşük teklif savunma dilekçesi şablonu ve gerçek KİK kararlarından kabul/red örnekleri.",
    datePublished: "2026-01-15",
    dateModified: new Date().toISOString().split("T")[0],
    author: { "@type": "Organization", name: "KikBul", url: "https://kikbul.com" },
    publisher: { "@type": "Organization", name: "KikBul", url: "https://kikbul.com" },
    mainEntityOfPage: "https://kikbul.com/asiri-dusuk-teklif-savunma-ornegi",
  };

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Aşırı Düşük Teklif Savunması Nasıl Hazırlanır?",
    description:
      "4734 sayılı Kamu İhale Kanunu kapsamında aşırı düşük teklif açıklaması hazırlama adımları.",
    step: [
      { "@type": "HowToStep", position: 1, name: "İhale Dokümanını İnceleyin", text: "İdari şartname ve teknik şartnamedeki aşırı düşük teklif değerlendirme kriterlerini belirleyin." },
      { "@type": "HowToStep", position: 2, name: "Maliyet Bileşenlerini Tespit Edin", text: "İşçilik, malzeme, makine, nakliye, genel gider ve kâr kalemlerini ayrı ayrı hesaplayın." },
      { "@type": "HowToStep", position: 3, name: "Belgeleri Hazırlayın", text: "Proforma faturalar, maliyet tespit tutanakları ve resmi tarifelere dayalı hesaplamaları düzenleyin." },
      { "@type": "HowToStep", position: 4, name: "Açıklama Dilekçesini Yazın", text: "Tüm maliyet kalemlerini açıklayan dilekçeyi hazırlayın ve destekleyici belgeleri ekleyin." },
      { "@type": "HowToStep", position: 5, name: "Süresinde Teslim Edin", text: "Açıklamayı idare tarafından verilen süre içinde yazılı olarak teslim edin." },
    ],
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
      { "@type": "ListItem", position: 2, name: "Rehberler", item: "https://kikbul.com/blog" },
      {
        "@type": "ListItem",
        position: 3,
        name: "Aşırı Düşük Teklif Savunma Örneği",
        item: "https://kikbul.com/asiri-dusuk-teklif-savunma-ornegi",
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">Ana Sayfa</Link>
            </li>
            <li className="before:content-['/'] before:mx-1.5">
              <Link href="/blog" className="hover:text-foreground transition-colors">Rehberler</Link>
            </li>
            <li className="before:content-['/'] before:mx-1.5 font-medium text-foreground">
              Aşırı Düşük Teklif Savunma Örneği
            </li>
          </ol>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          Aşırı Düşük Teklif Savunma Örneği 2026
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          KİK kararlarına dayalı gerçek örnekler, savunma dilekçesi şablonu ve maliyet bileşeni bazında açıklama rehberi.
        </p>

        {/* Yasal Dayanak */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 mb-10 dark:border-blue-900 dark:bg-blue-950/30">
          <h2 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-200">Yasal Dayanak</h2>
          <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
            <li><strong>4734 sayılı Kamu İhale Kanunu, Madde 38:</strong> Aşırı düşük tekliflerin değerlendirilmesi</li>
            <li><strong>Hizmet Alımı İhaleleri Uygulama Yönetmeliği, Madde 59:</strong> Aşırı düşük teklif sorgulaması</li>
            <li><strong>Yapım İşleri İhaleleri Uygulama Yönetmeliği, Madde 60:</strong> Yapım işlerinde aşırı düşük teklif</li>
            <li><strong>Mal Alımı İhaleleri Uygulama Yönetmeliği, Madde 58:</strong> Mal alımlarında aşırı düşük teklif</li>
          </ul>
        </div>

        {/* Aşırı Düşük Teklif Nedir? */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="asiri-dusuk-teklif-nedir">Aşırı Düşük Teklif Nedir?</h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              Aşırı düşük teklif, kamu ihalelerinde sınır değerin altında kalan teklifler için kullanılan bir kavramdır.
              4734 sayılı Kamu İhale Kanununun 38. maddesi uyarınca, ihale komisyonu tarafından verilen tekliflerden
              diğer tekliflere veya idarenin tespit ettiği yaklaşık maliyete göre teklif fiyatı aşırı düşük olanlar
              tespit edilir ve bu teklifler değerlendirme dışı bırakılmadan önce isteklilerden yazılı açıklama istenir.
            </p>
            <p>
              İsteklilerin aşırı düşük olarak belirlenen tekliflerine ilişkin açıklamaları; işin ekonomik yapısı,
              seçilen teknik çözümler, yapım yöntemi, mal ve hizmetlerin özgün ve avantajlı koşulları gibi
              objektif veriler üzerinden değerlendirilir. İhale komisyonu, sunulan açıklamaları yeterli bulan
              isteklilerin tekliflerini kabul eder; yeterli bulmadığı veya açıklama sunmayan isteklilerin tekliflerini reddeder.
            </p>
            <p>
              Sınır değer hesaplaması, ihale türüne göre farklı formüller kullanılarak yapılır. Yapım işlerinde
              ve hizmet alımlarında R katsayısı kullanılarak sınır değer tespit edilir. KİK her yıl sınır değer
              tespit katsayısını güncelleyerek yayımlar.
            </p>
          </div>
        </section>

        {/* Sınır Değer Hesaplama */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="sinir-deger-hesaplama">Sınır Değer Hesaplama</h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              Sınır değer, ihalelerde aşırı düşük teklif sorgulamasının yapılıp yapılmayacağını belirleyen eşik
              tutardır. İhale komisyonu, teklif fiyatlarını kullanarak matematiksel bir formül ile sınır değeri
              hesaplar ve bu değerin altında kalan tekliflere aşırı düşük teklif sorgulaması uygular.
            </p>
            <p>
              <strong>Yapım işlerinde sınır değer formülü:</strong> Geçerli tekliflerin aritmetik ortalamasının
              hesaplanması, bu ortalamanın altında kalan tekliflerin ikinci bir ortalamasının alınması ve R
              katsayısı ile çarpılarak sınır değerin belirlenmesi şeklindedir. 2026 yılı için KİK tarafından
              belirlenen R katsayısı yapım işleri için farklı, hizmet alımları için farklı uygulanmaktadır.
            </p>
            <p>
              <strong>Hizmet alımlarında sınır değer:</strong> Personel çalıştırılmasına dayalı hizmet alımlarında
              sınır değer; asgari işçilik maliyeti, %4 sözleşme giderleri ve genel giderler toplamı üzerinden
              belirlenir. Diğer hizmet alımlarında ise yapım işlerine benzer formül uygulanır.
            </p>
            <div className="not-prose">
              <Link href="/hesaplamalar" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                Sınır Değer Hesaplama Aracını Kullanın &rarr;
              </Link>
            </div>
            <p className="mt-4">
              KİK tarafından yayımlanan sınır değer katsayıları yıldan yıla güncellenmektedir. Güncel katsayılar
              ve detaylı açıklamalar için{" "}
              <Link href="/sinir-deger-hesaplama" className="text-primary hover:underline">sınır değer hesaplama sayfamızı</Link>{" "}
              ziyaret edebilirsiniz.
            </p>
          </div>
          {sinirDegerKararlar.length > 0 && (
            <div className="mt-4 rounded-lg border p-4 bg-muted/30">
              <h3 className="font-semibold mb-2 text-sm">İlgili KİK Kararları &mdash; Sınır Değer</h3>
              <ul className="space-y-1">
                {sinirDegerKararlar.map((d) => (
                  <li key={d.id} className="text-sm">
                    <Link href={`/kararlar/${d.id}`} className="text-primary hover:underline">{d.decisionNo}</Link>
                    {" \u2014 "}
                    <span className="text-muted-foreground">{d.subject?.substring(0, 80)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Savunma Dilekçesi Şablonu */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="savunma-dilekcesi-sablonu">Aşırı Düşük Teklif Savunma Dilekçesi Şablonu</h2>
          <div className="rounded-xl border bg-card p-6 space-y-4 text-sm leading-relaxed">
            <div className="text-center font-semibold mb-6">
              <p>[İDARENİN ADI]</p>
              <p>[İHALE KOMİSYONU BAŞKANLIĞINA]</p>
            </div>
            <p><strong>Konu:</strong> [İhale Kayıt Numarası] numaralı &quot;[İhalenin Adı]&quot; ihalesine ilişkin aşırı düşük teklif açıklamamız hk.</p>
            <p><strong>İlgi:</strong> [Tarih] tarihli ve [Sayı] sayılı aşırı düşük teklif sorgulama yazınız.</p>
            <p>
              İlgi yazınız ile firmamız tarafından sunulan [Teklif Tutarı] TL tutarındaki teklifimize ilişkin aşırı
              düşük teklif açıklaması istenilmiştir. 4734 sayılı Kanunun 38. maddesi ve ilgili mevzuat hükümleri
              çerçevesinde teklif bileşenlerimize ilişkin açıklamalarımız aşağıda sunulmaktadır.
            </p>

            <div className="border-t pt-4">
              <p className="font-semibold mb-2">1. İŞÇİLİK MALİYETLERİ</p>
              <p>İşin ifası için öngörülen [Personel Sayısı] adet personelin aylık brüt maliyeti, 2026 yılı asgari ücret üzerinden aşağıdaki şekilde hesaplanmıştır:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Brüt asgari ücret: [Tutar] TL</li>
                <li>SGK işveren payı (%22,5): [Tutar] TL</li>
                <li>İşsizlik sigortası işveren payı (%2): [Tutar] TL</li>
                <li>Yemek bedeli (günlük [Tutar] TL x 26 gün): [Tutar] TL</li>
                <li>Yol bedeli (günlük [Tutar] TL x 26 gün): [Tutar] TL</li>
                <li><strong>Toplam aylık kişi maliyeti: [Tutar] TL</strong></li>
              </ul>
              <p className="mt-2"><em>Ek: Asgari işçilik maliyeti hesap cetveli (EK-1)</em></p>
            </div>

            <div className="border-t pt-4">
              <p className="font-semibold mb-2">2. MALZEME MALİYETLERİ</p>
              <p>İşin ifasında kullanılacak malzemelere ilişkin birim fiyatlar, EK-O.7 formatında düzenlenmiş fiyat teklifleri ile tevsik edilmektedir.</p>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2">Malzeme Adı</th>
                      <th className="text-right p-2">Miktar</th>
                      <th className="text-right p-2">Birim Fiyat</th>
                      <th className="text-right p-2">Toplam</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b"><td className="p-2">[Malzeme 1]</td><td className="text-right p-2">[Miktar]</td><td className="text-right p-2">[Fiyat] TL</td><td className="text-right p-2">[Toplam] TL</td></tr>
                    <tr className="border-b"><td className="p-2">[Malzeme 2]</td><td className="text-right p-2">[Miktar]</td><td className="text-right p-2">[Fiyat] TL</td><td className="text-right p-2">[Toplam] TL</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2"><em>Ek: Proforma faturalar ve fiyat teklif mektupları (EK-2)</em></p>
            </div>

            <div className="border-t pt-4">
              <p className="font-semibold mb-2">3. MAKİNE-EKİPMAN MALİYETLERİ</p>
              <p>İşte kullanılacak makine-ekipman firmamızın kendi demirbaşı olup, amortisman ve işletme giderleri hesaplanmıştır.</p>
              <p className="mt-2"><em>Ek: Demirbaş kayıtları, amortisman tablosu (EK-3)</em></p>
            </div>

            <div className="border-t pt-4">
              <p className="font-semibold mb-2">4. NAKLİYE MALİYETLERİ</p>
              <p>Nakliye giderleri, Karayolları Genel Müdürlüğü birim fiyatları ve/veya fiyat teklifi ile tevsik edilmektedir.</p>
            </div>

            <div className="border-t pt-4">
              <p className="font-semibold mb-2">5. GENEL GİDERLER VE KÂR</p>
              <p>Sözleşme giderleri (%[Oran]), genel giderler (%[Oran]) ve kâr (%[Oran]) olmak üzere toplam [Tutar] TL öngörülmüştür.</p>
            </div>

            <div className="border-t pt-4">
              <p className="font-semibold mb-2">SONUÇ VE TALEP</p>
              <p>Yukarıda açıklanan maliyet bileşenlerinin toplamı [Toplam Tutar] TL olup, teklifimiz olan [Teklif Tutarı] TL ile birebir örtüşmektedir. Teklifimizin uygun bulunarak değerlendirmeye alınmasını saygılarımızla arz ederiz.</p>
              <div className="mt-6 text-right">
                <p>[Tarih]</p>
                <p className="font-semibold">[Firma Adı]</p>
                <p>[Yetkili Ad Soyad]</p>
                <p>[İmza / Kaşe]</p>
              </div>
            </div>
          </div>
        </section>

        {/* Kabul Edilen Açıklama Örnekleri */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="kabul-edilen-aciklama-ornekleri">Kabul Edilen Aşırı Düşük Teklif Açıklama Örnekleri</h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              Aşağıda, KİK Düzenleyici Kurul kararlarında aşırı düşük teklif açıklamasının kabul edildiği
              emsal kararlar listelenmiştir. Bu kararları inceleyerek başarılı bir açıklamanın hangi unsurları taşıması gerektiğini anlayabilirsiniz.
            </p>
            <p>
              Kabul edilen açıklamalarda ortak noktalar: Tüm maliyet bileşenlerinin detaylı şekilde belgelendirilmesi, proforma faturaların usulüne uygun düzenlenmesi, resmi kurum tarifelerinin doğru kullanılması ve aritmetik tutarlılık.
            </p>
            <p>
              Özellikle personel çalıştırılmasına dayalı hizmet alımlarında, asgari işçilik maliyetinin eksiksiz hesaplanması ve sosyal güvenlik primlerinin doğru yansıtılması kritik önem taşır. KİK kararlarında, tek bir maliyet kaleminin bile eksik açıklanmasının teklif reddiyle sonuçlanabildiği görülmektedir.
            </p>
            <p>
              İdarelerin sorgulama yazılarında belirledikleri &quot;açıklama istenilecek iş kalemleri&quot; mutlaka eksiksiz olarak cevaplanmalıdır. İdare tarafından açıklama istenen ancak istekli tarafından açıklanmayan kalemler, doğrudan teklifin reddine yol açmaktadır.
            </p>
          </div>
          {asiriDusukKararlar.length > 0 && (
            <div className="mt-4 space-y-3">
              {asiriDusukKararlar.map((d) => (
                <div key={d.id} className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                  <Link href={`/kararlar/${d.id}`} className="font-semibold text-primary hover:underline">{d.decisionNo}</Link>
                  <p className="text-sm text-muted-foreground mt-1">{d.subject}</p>
                  {d.decisionDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Karar Tarihi: {new Date(d.decisionDate).toLocaleDateString("tr-TR")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Reddedilen Açıklama Örnekleri */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="reddedilen-aciklama-ornekleri">Reddedilen Aşırı Düşük Teklif Açıklama Örnekleri</h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              Aşırı düşük teklif açıklamasının reddedilmesine neden olan en yaygın durumlar ve bu konudaki KİK kararları aşağıda özetlenmiştir. Bu kararlar, savunmanızda kaçınmanız gereken hataları göstermektedir.
            </p>
            <p>
              <strong>Red Sebepleri:</strong> En sık karşılaşılan red gerekçeleri arasında; açıklanması istenen tüm iş kalemlerinin cevaplanmaması, proforma faturaların usulüne uygun düzenlenmemesi, aritmetik hataların bulunması, resmi kurum tarifelerinden düşük fiyat öngörülmesi ve belgelerin yetersiz olması yer almaktadır.
            </p>
            <p>
              KİK, EK-O.5, EK-O.6 ve EK-O.7 formatlarına uygun düzenlenmeyen belgeleri geçerli kabul etmemektedir. Ayrıca, üçüncü kişilerden alınan fiyat tekliflerinde meslek mensubu onayının bulunmaması da sıklıkla red sebebi olmaktadır. Resmi kurum tarifesi bulunan giderlerde (elektrik, su, doğalgaz vb.) tarifenin altında açıklama yapılması mümkün değildir.
            </p>
            <p>
              Bir diğer önemli husus, açıklamanın süresinde yapılmasıdır. İdare tarafından verilen süre içinde açıklama yapılmaması halinde teklif değerlendirme dışı bırakılmaktadır.
            </p>
          </div>
        </section>

        {/* Maliyet Bileşeni Bazında Açıklama */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="maliyet-bileseni-bazinda-aciklama">Maliyet Bileşeni Bazında Açıklama Rehberi</h2>
          <div className="space-y-6">
            <div className="rounded-lg border p-5">
              <h3 className="text-lg font-semibold mb-2">1. İşçilik Maliyetleri</h3>
              <p className="text-sm text-muted-foreground">
                Personel çalıştırılmasına dayalı ihalelerde en kritik kalem işçilik maliyetidir. 2026 yılı brüt asgari ücret üzerinden hesaplanmalı, SGK işveren payı (%20,5 veya %22,5), işsizlik sigortası (%2), kıdem tazminatı karşılığı, yemek ve yol bedelleri eksiksiz hesaplanmalıdır. İhale dokümanında fazla mesai, resmi tatil çalışması, gece çalışması öngörülmüşse bunların bedelleri de ayrıca hesaba katılmalıdır. KİK, asgari işçilik maliyetinin altında açıklama yapılmasını kesinlikle kabul etmemektedir.
              </p>
            </div>
            <div className="rounded-lg border p-5">
              <h3 className="text-lg font-semibold mb-2">2. Malzeme Maliyetleri</h3>
              <p className="text-sm text-muted-foreground">
                Malzeme maliyetleri için proforma fatura (EK-O.7), fiyat teklifi veya maliyet/satış tutarı tespit tutanağı (EK-O.5, EK-O.6) sunulmalıdır. Proforma faturaların SMMM veya YMM onaylı olması zorunludur. Kamu kurum ve kuruluşlarının yayımladığı birim fiyat listeleri de malzeme açıklamasında kullanılabilir. Malzeme miktarlarının metraj hesabıyla uyumlu olması gerekmektedir.
              </p>
            </div>
            <div className="rounded-lg border p-5">
              <h3 className="text-lg font-semibold mb-2">3. Makine-Ekipman Maliyetleri</h3>
              <p className="text-sm text-muted-foreground">
                Makine-ekipman maliyetleri; amortisman, bakım-onarım, yakıt, sigorta ve operatör giderlerini kapsar. Firma kendi demirbaşını kullanıyorsa amortisman tablosu ve demirbaş kayıtları, kiralama yapılacaksa kira sözleşmesi veya fiyat teklifi sunulmalıdır.
              </p>
            </div>
            <div className="rounded-lg border p-5">
              <h3 className="text-lg font-semibold mb-2">4. Nakliye Maliyetleri</h3>
              <p className="text-sm text-muted-foreground">
                Nakliye giderleri, taşınacak malzemenin cinsi, miktarı ve taşıma mesafesine göre hesaplanır. Karayolları Genel Müdürlüğü nakliye birim fiyatları, belediye nakliye tarifeleri veya nakliyeci firmalardan alınan fiyat teklifleri kullanılabilir.
              </p>
            </div>
            <div className="rounded-lg border p-5">
              <h3 className="text-lg font-semibold mb-2">5. Genel Giderler ve Kâr</h3>
              <p className="text-sm text-muted-foreground">
                Sözleşme giderleri (damga vergisi, KİK payı vb.) genellikle teklif bedelinin %4 oranında hesaplanır. Genel yönetim giderleri ve kâr marjı, firmanın önceki dönem mali tablolarıyla desteklenmelidir. KİK, aşırı düşük olarak yalnızca %0 kâr ile bile açıklama yapılmasını kabul edebilmektedir; ancak negatif kâr (zarar) ile açıklama mümkün değildir.
              </p>
            </div>
          </div>
        </section>

        {/* Sık Yapılan Hatalar */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" id="sik-yapilan-hatalar">Sık Yapılan Hatalar</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold">Hata</th>
                  <th className="text-left p-3 font-semibold">Sonucu</th>
                  <th className="text-left p-3 font-semibold">Doğrusu</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b"><td className="p-3">Tüm iş kalemlerini açıklamamak</td><td className="p-3 text-red-600 dark:text-red-400">Teklif reddedilir</td><td className="p-3">İstenen tüm kalemleri tek tek açıklayın</td></tr>
                <tr className="border-b"><td className="p-3">EK-O formatlarını kullanmamak</td><td className="p-3 text-red-600 dark:text-red-400">Belgeler geçersiz sayılır</td><td className="p-3">EK-O.5, O.6, O.7, O.8 formatlarını kullanın</td></tr>
                <tr className="border-b"><td className="p-3">Meslek mensubu onayı eksik</td><td className="p-3 text-red-600 dark:text-red-400">Proforma geçersiz</td><td className="p-3">SMMM/YMM onayı ve kaşesini alın</td></tr>
                <tr className="border-b"><td className="p-3">Aritmetik hata yapmak</td><td className="p-3 text-red-600 dark:text-red-400">Açıklama reddedilir</td><td className="p-3">Tüm hesaplamaları çapraz kontrol edin</td></tr>
                <tr className="border-b"><td className="p-3">Resmi tarife altında fiyat göstermek</td><td className="p-3 text-red-600 dark:text-red-400">Kabul edilmez</td><td className="p-3">Elektrik, su, doğalgaz için resmi tarifeleri kullanın</td></tr>
                <tr className="border-b"><td className="p-3">Süresinde teslim etmemek</td><td className="p-3 text-red-600 dark:text-red-400">Teklif reddedilir</td><td className="p-3">Süreyi takip edin, gerekirse ek süre isteyin</td></tr>
                <tr className="border-b"><td className="p-3">Asgari ücret altında işçilik öngörmek</td><td className="p-3 text-red-600 dark:text-red-400">Kesinlikle reddedilir</td><td className="p-3">Güncel asgari ücret ve SGK primlerini kullanın</td></tr>
              </tbody>
            </table>
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

        {/* İş Deneyim Kararları */}
        {isDeneyimKararlar.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4" id="is-deneyim-kararlari">İlgili KİK Kararları &mdash; İş Deneyim Belgesi</h2>
            <div className="space-y-2">
              {isDeneyimKararlar.map((d) => (
                <div key={d.id} className="text-sm">
                  <Link href={`/kararlar/${d.id}`} className="text-primary hover:underline font-medium">{d.decisionNo}</Link>
                  {" \u2014 "}
                  <span className="text-muted-foreground">{d.subject?.substring(0, 100)}</span>
                </div>
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
            <Link href="/hesaplamalar" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">İhale Hesaplama Araçları</p>
              <p className="text-sm text-muted-foreground">Sınır değer, işçilik, bilanço hesaplayıcılar</p>
            </Link>
            <Link href="/sinir-deger-hesaplama" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">Sınır Değer Hesaplama</p>
              <p className="text-sm text-muted-foreground">Online sınır değer hesaplama aracı</p>
            </Link>
            <Link href="/yi-ufe-endeksi" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">Yİ-ÜFE Endeksi</p>
              <p className="text-sm text-muted-foreground">Aylık güncel endeks tablosu</p>
            </Link>
            <Link href="/is-deneyim-belgesi-guncelleme" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">İş Deneyim Belgesi Güncelleme</p>
              <p className="text-sm text-muted-foreground">Yİ-ÜFE ile güncelleme hesaplama</p>
            </Link>
            <Link href="/ciro-guncelleme" className="rounded-lg border bg-card p-3 hover:bg-muted transition-colors">
              <p className="font-medium">Ciro Güncelleme</p>
              <p className="text-sm text-muted-foreground">Yİ-ÜFE ile ciro güncelleme aracı</p>
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
