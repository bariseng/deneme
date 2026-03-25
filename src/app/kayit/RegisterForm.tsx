"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
  User,
  Building2,
  Phone,
  Eye,
  EyeOff,
  Loader2,
  FileText,
} from "lucide-react";

export default function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    companyName: "",
    taxNumber: "",
    terms: false,
  });

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.terms) {
      setError("Kullanım koşullarını kabul etmelisiniz");
      return;
    }

    if (form.password.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          companyName: form.companyName || undefined,
          taxNumber: form.taxNumber || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kayıt sırasında bir hata oluştu");
        return;
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/giris");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Kayıt sırasında bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

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
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
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
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
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
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  placeholder="Soyadınız"
                  className="w-full h-11 px-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    value={form.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                    placeholder="Firma adınız"
                    className="w-full h-11 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="taxNumber"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Vergi No
                </label>
                <div className="relative">
                  <FileText
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light"
                  />
                  <input
                    id="taxNumber"
                    type="text"
                    value={form.taxNumber}
                    onChange={(e) => updateField("taxNumber", e.target.value)}
                    placeholder="1234567890"
                    className="w-full h-11 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
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
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
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
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
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
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="En az 8 karakter"
                  className="w-full h-11 pl-10 pr-10 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-light hover:text-foreground"
                  aria-label="Şifreyi göster"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <input
                id="terms"
                type="checkbox"
                checked={form.terms}
                onChange={(e) => updateField("terms", e.target.checked)}
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
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Kayıt yapılıyor..." : "Ücretsiz Kayıt Ol"}
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
