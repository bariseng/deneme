"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, Send, Loader2 } from "lucide-react";

const TYPES = [
  { value: "MESLEKI", label: "Mesleki Sorumluluk Sigortası", desc: "Mesleki hata ve ihmallerden kaynaklanan zararlar" },
  { value: "ALL_RISK", label: "İnşaat All-Risk Sigortası", desc: "İnşaat sürecindeki tüm riskler (deprem, sel, yangın vb.)" },
  { value: "ISG", label: "İSG Sigortası", desc: "İş sağlığı ve güvenliği zorunlu sigorta" },
];

export default function SigortaFormClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    type: "MESLEKI",
    coverageAmount: "",
    duration: "12",
    description: "",
    tenderId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.coverageAmount || !form.duration) {
      setError("Teminat tutarı ve süre zorunludur");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/finance/insurance-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          coverageAmount: Number(form.coverageAmount),
          duration: Number(form.duration),
          description: form.description || undefined,
          tenderId: form.tenderId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Bir hata oluştu");
        return;
      }

      const data = await res.json();
      router.push(`/finans/sigorta/${data.id}`);
    } catch {
      setError("Sunucu hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/finans" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          Finans Marketplace
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-2">
          <Shield className="text-purple-600" size={28} />
          Sigorta Talebi
        </h1>
        <p className="text-gray-500 mb-8">
          Bilgileri girin, birden fazla sigorta şirketinden otomatik teklif alın
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Sigorta Türü *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: t.value })}
                  className={`text-left p-4 rounded-lg border-2 transition-colors ${
                    form.type === t.value
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-medium text-sm">{t.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teminat Tutarı (TL) *</label>
              <input
                type="number"
                value={form.coverageAmount}
                onChange={(e) => setForm({ ...form, coverageAmount: e.target.value })}
                placeholder="Örn: 10000000"
                min={0}
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {form.coverageAmount && (
                <p className="text-xs text-gray-500 mt-1">
                  {Number(form.coverageAmount).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Süre (Ay) *</label>
              <select
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full border rounded-lg px-4 py-2.5 text-sm"
              >
                <option value="6">6 ay</option>
                <option value="12">12 ay (1 yıl)</option>
                <option value="24">24 ay (2 yıl)</option>
                <option value="36">36 ay (3 yıl)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İlişkili İhale ID (Opsiyonel)</label>
            <input
              type="text"
              value={form.tenderId}
              onChange={(e) => setForm({ ...form, tenderId: e.target.value })}
              placeholder="İhale varsa ID girin"
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama (Opsiyonel)</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Proje detayları, özel gereksinimler..."
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Link href="/finans" className="px-6 py-2.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {loading ? "Teklif alınıyor..." : "Teklif Al"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
