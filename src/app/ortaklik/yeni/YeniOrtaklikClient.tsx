"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Handshake,
  Send,
  Loader2,
} from "lucide-react";
import Link from "next/link";

const SPECIALTIES = [
  { value: "YAPIM", label: "Yapım İşleri" },
  { value: "MAL_ALIMI", label: "Mal Alımı" },
  { value: "HIZMET", label: "Hizmet Alımı" },
  { value: "DANISMANLIK", label: "Danışmanlık" },
];

const CITIES = [
  "İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya",
  "Gaziantep", "Kayseri", "Trabzon", "Mersin", "Kocaeli", "Eskişehir",
  "Diyarbakır", "Samsun", "Denizli", "Malatya", "Erzurum", "Van",
  "Manisa", "Balıkesir", "Aydın", "Muğla", "Şanlıurfa", "Hatay",
  "Kahramanmaraş", "Sakarya", "Tekirdağ", "Ordu", "Sivas",
];

export default function YeniOrtaklikClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    requiredSpecialty: "YAPIM",
    requiredExperienceAmount: "",
    city: "İstanbul",
    tenderId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.title || !form.description || !form.requiredExperienceAmount) {
      setError("Lütfen zorunlu alanları doldurun");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/jv-matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          requiredExperienceAmount: Number(form.requiredExperienceAmount),
          tenderId: form.tenderId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Bir hata oluştu");
        return;
      }

      const data = await res.json();
      router.push(`/ortaklik/${data.id}`);
    } catch {
      setError("Sunucu hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/ortaklik"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft size={16} />
            İlanlar&apos;a Dön
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Handshake className="text-blue-600" size={28} />
            İş Ortaklığı İlanı Oluştur
          </h1>
          <p className="text-gray-500 mt-1">
            İhale için ortak arayışınızı yayınlayın, uyumlu firmalar otomatik eşleştirilsin
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İlan Başlığı *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Örn: Ankara Yüksek Hızlı Tren Projesi İçin Yapım Ortağı"
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama *
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Proje detayları, aranan partner özellikleri, iş deneyim gereksinimleri..."
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aranan Uzmanlık Alanı *
              </label>
              <select
                value={form.requiredSpecialty}
                onChange={(e) => setForm({ ...form, requiredSpecialty: e.target.value })}
                className="w-full border rounded-lg px-4 py-2.5 text-sm"
              >
                {SPECIALTIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gereken İş Deneyim Tutarı (TL) *
              </label>
              <input
                type="number"
                value={form.requiredExperienceAmount}
                onChange={(e) => setForm({ ...form, requiredExperienceAmount: e.target.value })}
                placeholder="Örn: 5000000"
                min={0}
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şehir *
              </label>
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full border rounded-lg px-4 py-2.5 text-sm"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İlişkili İhale ID (Opsiyonel)
              </label>
              <input
                type="text"
                value={form.tenderId}
                onChange={(e) => setForm({ ...form, tenderId: e.target.value })}
                placeholder="İhale varsa ID'sini girin"
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-1">Nasıl Çalışır?</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>1. İlanınızı oluşturun ve gereksinimlerinizi belirtin</li>
              <li>2. Sistem, platformdaki firmalarla otomatik eşleştirme yapar</li>
              <li>3. Uyumluluk skoru en yüksek firmalar listelenir (0-100 puan)</li>
              <li>4. Firma seçip NDA imzalayarak güvenli iletişim kurabilirsiniz</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/ortaklik"
              className="px-6 py-2.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {loading ? "Oluşturuluyor..." : "İlanı Yayınla"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
