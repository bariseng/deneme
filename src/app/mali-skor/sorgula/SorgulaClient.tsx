"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Building2, CreditCard, AlertCircle } from "lucide-react";

export default function SorgulaClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Firma adı zorunludur"); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/financial-health/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetCompanyName: name.trim(),
          targetTaxNumber: taxNumber.trim() || undefined,
        }),
      });

      if (res.status === 403) {
        setError("Rakip sorgulama premium üyelik gerektirir. Lütfen planınızı yükseltin.");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Sorgulama başarısız");
        return;
      }

      const score = await res.json();
      router.push(`/mali-skor/${score.id}`);
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/mali-skor" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          Mali Sağlık Skoru
        </Link>

        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Search size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Rakip Firma Sorgula</h1>
              <p className="text-sm text-gray-500">Firma adı veya vergi numarası ile sorgulayın</p>
            </div>
          </div>

          {/* Credit notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-start gap-2">
            <CreditCard size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-700">
              <strong>Premium Özellik:</strong> Her sorgulama 1 AI kredisi düşer. Skor 30 gün geçerlidir.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Building2 size={14} className="inline mr-1" />
                Firma Adı *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: ABC İnşaat A.Ş."
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Vergi Numarası (opsiyonel)
              </label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="Örn: 1234567890"
                maxLength={11}
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">Vergi numarası ile daha doğru sonuç elde edilir.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                "Sorgulanıyor..."
              ) : (
                <>
                  <Search size={16} />
                  Sorgula (1 Kredi)
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
