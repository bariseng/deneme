"use client";

import Link from "next/link";
import { Mail, Lock, Eye } from "lucide-react";

export default function LoginForm() {
  return (
    <div className="min-h-[calc(100vh-200px)] bg-background-alt flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">İP</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Hesabınıza Giriş Yapın
          </h1>
          <p className="text-foreground-light mt-2">
            İhaleleri takip etmeye devam edin
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label
                htmlFor="email"
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
                  id="email"
                  type="email"
                  placeholder="ornek@email.com"
                  className="w-full h-11 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  Şifre
                </label>
                <a
                  href="#"
                  className="text-xs text-primary hover:text-primary-dark"
                >
                  Şifremi Unuttum
                </a>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light"
                />
                <input
                  id="password"
                  type="password"
                  placeholder="********"
                  className="w-full h-11 pl-10 pr-10 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoComplete="current-password"
                  required
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

            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
              />
              <label
                htmlFor="remember"
                className="text-sm text-foreground-light"
              >
                Beni hatırla
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors"
            >
              Giriş Yap
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-foreground-light">
              Hesabınız yok mu?{" "}
              <Link
                href="/kayit"
                className="text-primary font-medium hover:text-primary-dark"
              >
                Ücretsiz Kayıt Olun
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
