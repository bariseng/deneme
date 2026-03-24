import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";

const footerLinks = {
  platform: [
    { label: "Tüm İhaleler", href: "/ihaleler" },
    { label: "Yapım İşleri", href: "/ihaleler?kategori=yapim" },
    { label: "Mal Alımı", href: "/ihaleler?kategori=mal-alimi" },
    { label: "Hizmet Alımı", href: "/ihaleler?kategori=hizmet" },
    { label: "Danışmanlık", href: "/ihaleler?kategori=danismanlik" },
  ],
  company: [
    { label: "Hakkımızda", href: "/hakkimizda" },
    { label: "İletişim", href: "/iletisim" },
    { label: "Gizlilik Politikası", href: "#" },
    { label: "Kullanım Koşulları", href: "#" },
    { label: "KVKK", href: "#" },
  ],
  support: [
    { label: "Sıkça Sorulan Sorular", href: "#" },
    { label: "Yardım Merkezi", href: "#" },
    { label: "API Dokümantasyonu", href: "#" },
    { label: "Blog", href: "#" },
  ],
};

const socialLinks = [
  { icon: ExternalLink, href: "#", label: "Facebook" },
  { icon: ExternalLink, href: "#", label: "Twitter" },
  { icon: ExternalLink, href: "#", label: "LinkedIn" },
  { icon: ExternalLink, href: "#", label: "Instagram" },
];

export default function Footer() {
  return (
    <footer className="bg-background-dark text-white" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">İP</span>
              </div>
              <span className="text-xl font-bold">İhalePro</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Türkiye genelindeki kamu ve özel sektör ihalelerini tek bir
              platformdan takip edin. Güncel ihale ilanları, sonuçları ve
              detaylı bilgiler İhalePro&apos;da.
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Phone size={14} />
                <span>0850 123 45 67</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} />
                <span>info@ihalepro.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} />
                <span>İstanbul, Türkiye</span>
              </div>
            </div>
          </div>

          {/* Platform links */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider mb-4">
              Platform
            </h3>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider mb-4">
              Kurumsal
            </h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support links */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider mb-4">
              Destek
            </h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            &copy; 2026 İhalePro. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label={social.label}
              >
                <social.icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
