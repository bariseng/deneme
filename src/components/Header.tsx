"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Menu,
  X,
  Search,
  User,
  ChevronDown,
  LogIn,
  LogOut,
  Settings,
} from "lucide-react";
import NotificationCenter from "./NotificationCenter";

const navItems = [
  { label: "Ana Sayfa", href: "/" },
  {
    label: "İhale Bul",
    href: "/ihaleler",
    children: [
      { label: "Tüm İhaleler", href: "/ihaleler" },
      { label: "KİK İhale Arama", href: "/ihaleler?kaynak=kik" },
      { label: "Yapım İşleri", href: "/ihaleler?kategori=yapim" },
      { label: "Mal Alımı", href: "/ihaleler?kategori=mal-alimi" },
      { label: "Hizmet Alımı", href: "/ihaleler?kategori=hizmet" },
      { label: "Danışmanlık", href: "/ihaleler?kategori=danismanlik" },
    ],
  },
  {
    label: "Hizmetlerimiz",
    href: "#",
    children: [
      { label: "Proje Yönetimi", href: "/projeler" },
      { label: "Belge Yönetimi", href: "/belgeler" },
      { label: "Rakip Analizi", href: "/firmalar" },
      { label: "Teklif Hazırlama", href: "/teklifler" },
      { label: "AI Özellikleri", href: "/ai" },
      { label: "İhale Avcısı (AI)", href: "/agent" },
      { label: "Pazar İstihbaratı", href: "/istihbarat" },
      { label: "Sözleşme Yönetimi", href: "/sozlesmeler" },
      { label: "Topluluk", href: "/topluluk" },
      { label: "White-Label & API", href: "/white-label" },
      { label: "Güvenlik", href: "/guvenlik" },
      { label: "İş Ortaklığı", href: "/ortaklik" },
      { label: "Finans Marketplace", href: "/finans" },
      { label: "Raporlama & Analitik", href: "/admin" },
      { label: "Entegrasyonlar", href: "/entegrasyonlar" },
      { label: "API Dokümantasyonu", href: "/api-docs" },
    ],
  },
  { label: "Referanslar", href: "/hakkimizda#referanslar" },
  { label: "Hakkımızda", href: "/hakkimizda" },
  { label: "İletişim", href: "/iletisim" },
];

export default function Header() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const isLoggedIn = !!session?.user;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      {/* Top bar */}
      <div className="bg-background-dark text-white text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-9">
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">
              Ücretsiz İhale Takip Portalı | İhaleye Açılan Her Kapı Burada!
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/premium"
              className="hidden sm:flex items-center gap-1 bg-secondary hover:bg-secondary-dark px-2.5 py-0.5 rounded text-xs font-semibold transition-colors"
            >
              Premium
            </Link>
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1 hover:text-primary-light transition-colors"
                  aria-label="Kontrol paneli"
                >
                  <User size={14} />
                  <span>Panelim</span>
                </Link>
                <Link
                  href="/ayarlar"
                  className="flex items-center gap-1 hover:text-primary-light transition-colors"
                  aria-label="Ayarlar"
                >
                  <Settings size={14} />
                  <span>Ayarlar</span>
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-1 hover:text-primary-light transition-colors"
                >
                  <LogOut size={14} />
                  <span>Çıkış</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1 hover:text-primary-light transition-colors"
                  aria-label="Kontrol paneli"
                >
                  <User size={14} />
                  <span>Panelim</span>
                </Link>
                <Link
                  href="/giris"
                  className="flex items-center gap-1 hover:text-primary-light transition-colors"
                  aria-label="Giriş yap"
                >
                  <LogIn size={14} />
                  <span>Giriş Yap</span>
                </Link>
                <Link
                  href="/kayit"
                  className="bg-secondary hover:bg-secondary-dark px-3 py-1 rounded text-xs font-semibold transition-colors"
                >
                  Ücretsiz Kayıt
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        aria-label="Ana navigasyon"
      >
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">İP</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-primary leading-tight">
                İhalePro
              </span>
              <span className="text-[10px] text-foreground-light leading-tight">
                İhale Takip Platformu
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() =>
                  item.children && setDropdownOpen(item.label)
                }
                onMouseLeave={() => setDropdownOpen(null)}
              >
                <Link
                  href={item.href}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground hover:text-primary rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {item.label}
                  {item.children && <ChevronDown size={14} />}
                </Link>
                {item.children && dropdownOpen === item.label && (
                  <div className="absolute top-full left-0 mt-0 w-52 bg-white rounded-lg shadow-lg border border-border py-2 z-50">
                    {item.children.map((child) => (
                      <Link
                        key={child.label}
                        href={child.href}
                        className="block px-4 py-2 text-sm text-foreground hover:bg-blue-50 hover:text-primary transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Search & actions */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="İhale ara..."
                className="w-56 h-10 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                aria-label="İhale arama"
              />
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light"
              />
            </div>
            <NotificationCenter />
            <Link
              href="/giris"
              className="p-2 text-foreground-light hover:text-primary transition-colors"
              aria-label="Hesabım"
            >
              <User size={20} />
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border py-4 space-y-2">
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="İhale ara..."
                className="w-full h-10 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="İhale arama"
              />
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light"
              />
            </div>
            {navItems.map((item) => (
              <div key={item.label}>
                <Link
                  href={item.href}
                  className="block px-4 py-2 text-sm font-medium text-foreground hover:bg-blue-50 hover:text-primary rounded-lg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
                {item.children &&
                  item.children.map((child) => (
                    <Link
                      key={child.label}
                      href={child.href}
                      className="block pl-8 pr-4 py-2 text-sm text-foreground-light hover:bg-blue-50 hover:text-primary rounded-lg transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      {child.label}
                    </Link>
                  ))}
              </div>
            ))}
            <div className="flex gap-2 px-4 pt-2">
              <Link
                href="/giris"
                className="flex-1 text-center py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Giriş Yap
              </Link>
              <Link
                href="/kayit"
                className="flex-1 text-center py-2 bg-secondary text-white rounded-lg text-sm font-medium hover:bg-secondary-dark transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Kayıt Ol
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
