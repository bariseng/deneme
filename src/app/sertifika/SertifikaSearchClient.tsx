"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Search } from "lucide-react";

export default function SertifikaSearchClient() {
  const router = useRouter();
  const [certNumber, setCertNumber] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = certNumber.trim();
    if (trimmed) {
      router.push(`/sertifika/${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border shadow-sm max-w-md w-full p-8 text-center">
        <Award size={48} className="mx-auto text-blue-600 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sertifika Doğrulama</h1>
        <p className="text-gray-500 text-sm mb-6">
          İhalePro Akademi sertifika numarasını girerek sertifikanın geçerliliğini doğrulayabilirsiniz.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
              placeholder="Sertifika numarası girin..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={!certNumber.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Doğrula
          </button>
        </form>
      </div>
    </div>
  );
}
