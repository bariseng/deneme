"use client";

import Link from "next/link";
import { Mail, Lock, User, Building2, Phone, Eye } from "lucide-react";

export default function RegisterForm() {
  return (
    <div className="min-h-[calc(100vh-200px)] bg-background-alt flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">İP</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Ücretsiz Hesap Oluşturun
          </h1>
          <p className="text-foreground-light mt-2">
            İlk 30 gün tüm premium özellikler ücretsiz
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Ad
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light"
                  />
                  <input
                    id="firstName"
                    type="text"
                    placeholder="Adınız"
                    className="w-full h-11 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Soyad
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Soyadınız"
                  className="w-full h-11 px-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="company"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Firma Adı
              </label>
              <div className="relative">
                <Building2
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light"
                />
                <input
                  id="company"
                  type="text"
                  placeholder="Firma adınız"
                  className="w-full h-11 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="regEmail"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light"
                />
                <input
                  id="regEmail"
                  type="email"
                  placeholder="ornek@email.com"
                  className="w-full h-11 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Telefon
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light"
                />
                <input
                  id="phone"
                  type="tel"
                  placeholder="05XX XXX XX XX"
                  className="w-full h-11 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="regPassword"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Şifre
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light"
                />
                <input
                  id="regPassword"
                  type="password"
                  placeholder="En az 8 karakter"
                  className="w-full h-11 pl-10 pr-10 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-light hover:text-foreground"
                  aria-label="Şifreyi göster"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <input
                id="terms"
                type="checkbox"
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary mt-0.5"
                required
              />
              <label htmlFor="terms" className="text-sm text-foreground-light">
                <Link href="#" className="text-primary hover:underline">
                  Kullanım Koşulları
                </Link>
                &apos;nı ve{" "}
                <Link href="#" className="text-primary hover:underline">
                  Gizlilik Politikası
                </Link>
                &apos;nı okudum, kabul ediyorum.
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors"
            >
              Ücretsiz Kayıt Ol
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-foreground-light">
              Zaten hesabınız var mı?{" "}
              <Link
                href="/giris"
                className="text-primary font-medium hover:text-primary-dark"
              >
                Giriş Yapın
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
