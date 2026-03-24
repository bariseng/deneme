"use client";

import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";

const footerLinks = {
  platform: [
    { label: "İhale Bul", href: "/ihaleler" },
    { label: "KİK İhale Arama", href: "/ihaleler?kaynak=kik" },
    { label: "Birim Fiyatlar", href: "/ihaleler?hizmet=birim-fiyatlar" },
    { label: "Rakip Analizi", href: "/ihaleler?hizmet=rakip-analizi" },
    { label: "İhale Analiz", href: "/ihaleler?hizmet=ihale-analiz" },
  ],
  company: [
    { label: "Hakkımızda", href: "/hakkimizda" },
    { label: "Referanslar", href: "/hakkimizda#referanslar" },
    { label: "İletişim", href: "/iletisim" },
    { label: "Gizlilik Politikası", href: "#" },
    { label: "Kullanım Koşulları", href: "#" },
  ],
  support: [
    { label: "Nasıl Arama Yaparım?", href: "#" },
    { label: "İhale Takip Nedir?", href: "#" },
    { label: "İhaleye Nasıl Girilir?", href: "#" },
    { label: "EKAP İhale Sorgulama", href: "#" },
    { label: "E-İhale İndir", href: "#" },
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
                <span>0312 911 35 27</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} />
                <span>iletisim@ihalepro.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} />
                <span>ODTÜ Teknokent, Çankaya / Ankara</span>
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

        {/* Newsletter */}
        <div className="mt-10 pt-8 border-t border-gray-700">
          <div className="max-w-md">
            <h3 className="font-semibold text-sm uppercase tracking-wider mb-2">
              Aylık Bülten - Takipte Kalın
            </h3>
            <p className="text-sm text-gray-400 mb-3">
              Güncel ihale haberleri ve fırsatlar için bültenimize abone olun.
            </p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="E-posta adresiniz"
                className="flex-1 h-10 px-4 text-sm bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                aria-label="Bülten e-posta adresi"
              />
              <button
                type="submit"
                className="h-10 px-5 bg-secondary hover:bg-secondary-dark text-white text-sm font-medium rounded-lg transition-colors"
              >
                Abone Ol
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
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
