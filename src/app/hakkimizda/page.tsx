import type { Metadata } from "next";
import {
  Target,
  Eye,
  Users,
  Award,
  CheckCircle2,
  Building2,
  Globe,
  TrendingUp,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "İhalePro hakkında bilgi edinin. Türkiye'nin en kapsamlı ihale takip platformu olarak misyonumuz ve vizyonumuz.",
  openGraph: {
    title: "Hakkımızda | İhalePro",
    description: "Türkiye'nin en kapsamlı ihale takip platformu.",
  },
};

const teamStats = [
  { icon: Users, value: "50+", label: "Uzman Ekip" },
  { icon: Building2, value: "8.200+", label: "Kayıtlı Firma" },
  { icon: Globe, value: "81", label: "Şehir" },
  { icon: TrendingUp, value: "12.450+", label: "Aktif İhale" },
];

const values = [
  {
    icon: Target,
    title: "Doğruluk",
    desc: "Resmi kaynaklardan doğrulanmış, güncel ve doğru ihale bilgileri sunmayı taahhüt ediyoruz.",
  },
  {
    icon: Eye,
    title: "Şeffaflık",
    desc: "İhale süreçlerinde şeffaflığı artırmak ve adil rekabet ortamı oluşturmak en temel ilkemizdir.",
  },
  {
    icon: Users,
    title: "Müşteri Odaklılık",
    desc: "Kullanıcılarımızın ihtiyaçlarını anlamak ve en iyi deneyimi sunmak için sürekli gelişiyoruz.",
  },
  {
    icon: Award,
    title: "İnovasyon",
    desc: "Yapay zeka ve ileri teknolojilerle ihale takip süreçlerini sürekli iyileştiriyoruz.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-background-alt">
      {/* Hero */}
      <section className="bg-gradient-to-r from-background-dark to-primary py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-4">
            Hakkımızda
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto">
            Türkiye&apos;nin ihale ekosistemini dijitalleştiren,
            firmaların doğru ihalelere ulaşmasını kolaylaştıran teknoloji
            platformuyuz.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="relative -mt-8 z-10 mb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl border border-border grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {teamStats.map((stat) => (
              <div key={stat.label} className="p-6 text-center">
                <stat.icon
                  size={28}
                  className="mx-auto text-primary mb-2"
                />
                <p className="text-2xl font-extrabold text-foreground">
                  {stat.value}
                </p>
                <p className="text-sm text-foreground-light">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                Misyonumuz
              </h2>
              <p className="text-foreground-light leading-relaxed mb-4">
                Eflatun Yazılım tarafından geliştirilen İhalePro, ODTÜ
                Teknokent Bilişim ve İnovasyon Merkezi&apos;nde faaliyet
                göstermektedir. Milyonlarca ihale sonucu ve sözleşme
                bilgisini içeren veritabanımız, özgün yazılım
                algoritmalarımızla işlenerek kullanıcılara sunulmaktadır.
              </p>
              <p className="text-foreground-light leading-relaxed mb-6">
                Türkiye genelinde pek çok farklı sektörden firma ve kamu
                kurumuna hizmet veren İhalePro, yapay zeka destekli ihale
                arama, rakip analizi ve kapsamlı raporlama özellikleri
                sunmaktadır.
              </p>
              <ul className="space-y-3">
                {[
                  "7/24 güncel ihale bilgileri",
                  "Yapay zeka destekli ihale eşleştirme",
                  "Anlık e-posta ve SMS bildirimleri",
                  "Detaylı ihale analiz raporları",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <CheckCircle2 size={18} className="text-accent shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-8 md:p-12 text-white">
              <h3 className="text-xl font-bold mb-4">Vizyonumuz</h3>
              <p className="text-blue-100 leading-relaxed mb-4">
                Türkiye&apos;nin ihale ekosistemini tamamen dijitalleştirerek,
                şeffaf, erişilebilir ve verimli bir piyasa ortamı
                oluşturmak.
              </p>
              <p className="text-blue-100 leading-relaxed">
                Yapay zeka ve büyük veri teknolojilerini kullanarak firmaların
                en uygun ihaleleri otomatik olarak bulmalarını sağlayan,
                küresel ölçekte rekabet edebilen bir platform olmayı
                hedefliyoruz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Değerlerimiz
            </h2>
            <p className="text-foreground-light max-w-xl mx-auto">
              Her kararımızda bizi yönlendiren temel değerlerimiz
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div
                key={value.title}
                className="text-center p-6 rounded-xl border border-border hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <value.icon size={28} className="text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-sm text-foreground-light leading-relaxed">
                  {value.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
