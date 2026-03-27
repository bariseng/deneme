import Link from "next/link";
import {
  Search,
  ArrowRight,
  Building2,
  Package,
  Briefcase,
  Users,
  Monitor,
  Heart,
  GraduationCap,
  Truck,
  CheckCircle2,
  Shield,
  Zap,
  BarChart3,
} from "lucide-react";
import TenderCard from "@/components/TenderCard";
import { categories } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { mapApiTender } from "@/lib/api-client";

const iconMap: Record<string, React.ElementType> = {
  Building2,
  Package,
  Briefcase,
  Users,
  Monitor,
  Heart,
  GraduationCap,
  Truck,
};

export default async function Home() {
  const dbTenders = await prisma.tender.findMany({
    where: { status: "BASVURU_ACIK" },
    orderBy: { publishDate: "desc" },
    take: 6,
    select: {
      id: true, title: true, institution: true, city: true,
      tenderType: true, status: true, ekapNo: true, estimatedCost: true,
      publishDate: true, deadline: true, description: true,
      latitude: true, longitude: true,
    },
  });

  const activeTenders = dbTenders.map((t) =>
    mapApiTender({
      ...t,
      estimatedCost: t.estimatedCost?.toString() ?? null,
      publishDate: t.publishDate.toISOString(),
      deadline: t.deadline.toISOString(),
      latitude: t.latitude ? Number(t.latitude) : null,
      longitude: t.longitude ? Number(t.longitude) : null,
    }),
  );

  const [tenderCount, companyCount] = await Promise.all([
    prisma.tender.count({ where: { status: "BASVURU_ACIK" } }),
    prisma.company.count(),
  ]);

  const stats = [
    { label: "Aktif İhale", value: tenderCount.toLocaleString("tr-TR") + "+" },
    { label: "Kayıtlı Firma", value: companyCount.toLocaleString("tr-TR") + "+" },
    { label: "Kurum", value: "3.500+" },
    { label: "Şehir", value: "81" },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-background-dark via-primary-dark to-primary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTQiLz48L2c+PC9nPjwvc3ZnPg==')]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 lg:py-36">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
              İhaleye Açılan Her Kapı{" "}
              <span className="text-secondary">Burada!</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Ücretsiz ihale takibi ve dahası için hemen üye olun. Yapay zeka
              destekli ihale arama, rakip analizi ve anlık bildirimler.
            </p>

            {/* Search bar */}
            <div className="max-w-2xl mx-auto">
              <form
                className="flex flex-col sm:flex-row gap-3"
                role="search"
                aria-label="İhale arama"
              >
                <div className="relative flex-1">
                  <Search
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-light"
                  />
                  <input
                    type="text"
                    placeholder="İhale adı, kurum veya anahtar kelime..."
                    className="w-full h-14 pl-12 pr-4 rounded-xl text-base border-0 shadow-lg focus:outline-none focus:ring-4 focus:ring-white/30"
                    aria-label="İhale arama kutusu"
                  />
                </div>
                <select
                  className="h-14 px-4 rounded-xl text-sm border-0 shadow-lg bg-white text-foreground focus:outline-none focus:ring-4 focus:ring-white/30"
                  aria-label="Şehir seçin"
                >
                  <option value="">Tüm Şehirler</option>
                  <option value="istanbul">İstanbul</option>
                  <option value="ankara">Ankara</option>
                  <option value="izmir">İzmir</option>
                  <option value="bursa">Bursa</option>
                  <option value="antalya">Antalya</option>
                </select>
                <button
                  type="submit"
                  className="h-14 px-8 bg-secondary hover:bg-secondary-dark text-white font-semibold rounded-xl shadow-lg transition-colors"
                >
                  Ara
                </button>
              </form>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {["Yapım İşleri", "Bilişim", "Sağlık", "Danışmanlık"].map(
                  (tag) => (
                    <Link
                      key={tag}
                      href={`/ihaleler?q=${encodeURIComponent(tag)}`}
                      className="px-3 py-1 text-xs text-blue-100 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                    >
                      {tag}
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats section */}
      <section className="relative -mt-8 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl border border-border grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {stats.map((stat) => (
              <div key={stat.label} className="p-6 text-center">
                <p className="text-2xl md:text-3xl font-extrabold text-primary">
                  {stat.value}
                </p>
                <p className="text-sm text-foreground-light mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 md:py-20 bg-background-alt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              İhale Kategorileri
            </h2>
            <p className="text-foreground-light max-w-xl mx-auto">
              İhtiyacınıza uygun ihale kategorisini seçerek hızlıca arama yapın
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {categories.map((cat) => {
              const Icon = iconMap[cat.icon] || Building2;
              return (
                <Link
                  key={cat.slug}
                  href={`/ihaleler?kategori=${cat.slug}`}
                  className="group flex flex-col items-center p-6 bg-white rounded-xl border border-border hover:border-primary hover:shadow-md transition-all"
                >
                  <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Icon
                      size={24}
                      className="text-primary group-hover:text-white transition-colors"
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground text-center">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-foreground-light mt-1">
                    {cat.count.toLocaleString("tr-TR")} ihale
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Tenders */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Öne Çıkan İhaleler
              </h2>
              <p className="text-foreground-light">
                En güncel ve yüksek bütçeli ihaleler
              </p>
            </div>
            <Link
              href="/ihaleler"
              className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
            >
              Tümünü Gör
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTenders.map((tender) => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>
          <div className="sm:hidden text-center mt-8">
            <Link
              href="/ihaleler"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark"
            >
              Tüm İhaleleri Gör
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Us CTA */}
      <section className="py-16 md:py-20 bg-background-alt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Neden İhalePro?
            </h2>
            <p className="text-foreground-light max-w-xl mx-auto">
              İhale takip sürecinizi kolaylaştıran profesyonel çözümler
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: "Yapay Zeka ile İhale Arama",
                desc: "Yapay zeka destekli arama motorumuz ile size en uygun ihaleleri otomatik olarak bulun.",
              },
              {
                icon: Shield,
                title: "Rakip Keşfetme & Analiz",
                desc: "Rakiplerinizin ihale geçmişlerini, sözleşme bedellerini ve sektörel dağılımlarını analiz edin.",
              },
              {
                icon: BarChart3,
                title: "Günlük İhale Raporu",
                desc: "Her gün size özel hazırlanan ihale raporlarıyla fırsatları kaçırmayın.",
              },
              {
                icon: CheckCircle2,
                title: "Kapsamlı İhale Databankası",
                desc: "Milyonlarca ihale sonucu ve sözleşme bilgisini içeren veritabanımızdan yararlanın.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white p-6 rounded-xl border border-border hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <item.icon size={24} className="text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-foreground-light leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-primary to-primary-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ücretsiz İhale Takibi ve Dahası İçin Ücretsiz Üye Olun
          </h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            İhalePro&apos;ya ücretsiz üye olarak günlük ihale raporları, yapay
            zeka destekli arama ve rakip analizi özelliklerinden yararlanın.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/kayit"
              className="inline-flex items-center justify-center h-12 px-8 bg-secondary hover:bg-secondary-dark text-white font-semibold rounded-xl transition-colors"
            >
              Ücretsiz Başla
              <ArrowRight size={18} className="ml-2" />
            </Link>
            <Link
              href="/hakkimizda"
              className="inline-flex items-center justify-center h-12 px-8 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-colors"
            >
              Daha Fazla Bilgi
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
