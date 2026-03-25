"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Radio, Settings, RefreshCw } from "lucide-react";
import LegalUpdateCard from "@/components/legal/LegalUpdateCard";
import ImpactBadge from "@/components/legal/ImpactBadge";
import { CATEGORY_LABELS, ALL_CATEGORIES, ALL_IMPACT_LEVELS } from "@/lib/legal-scanner-client";

interface LegalUpdate {
  id: string;
  title: string;
  source: string;
  category: string;
  impactLevel: string;
  summary: string;
  publishDate: string;
  originalUrl: string;
}

interface Stats {
  total: number;
  byCategory: { category: string; _count: number }[];
  byImpact: { impactLevel: string; _count: number }[];
}

export default function MevzuatClient() {
  const [updates, setUpdates] = useState<LegalUpdate[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [impactFilter, setImpactFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set("category", categoryFilter);
      if (impactFilter) params.set("impactLevel", impactFilter);

      const [updRes, statRes] = await Promise.all([
        fetch(`/api/legal/updates?${params}`),
        fetch("/api/legal/updates?action=stats"),
      ]);

      if (updRes.ok) {
        const data = await updRes.json();
        if (data.items && data.items.length === 0 && !categoryFilter && !impactFilter) {
          // Auto-seed if empty
          await fetch("/api/legal/updates?action=seed");
          const retry = await fetch(`/api/legal/updates?${params}`);
          if (retry.ok) {
            const retryData = await retry.json();
            setUpdates(retryData.items || []);
          }
          const retryStat = await fetch("/api/legal/updates?action=stats");
          if (retryStat.ok) setStats(await retryStat.json());
        } else {
          setUpdates(data.items || []);
          if (statRes.ok) setStats(await statRes.json());
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, impactFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Radio size={24} className="text-red-500" />
              Mevzuat Değişiklik Radarı
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Resmi Gazete ve KİK duyurularını otomatik takip edin
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 bg-white border px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw size={14} />
              Yenile
            </button>
            <Link
              href="/mevzuat/ayarlar"
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Settings size={14} />
              Bildirim Ayarları
            </Link>
          </div>
        </div>

        {/* Stats */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Toplam Güncelleme</p>
            </div>
            {stats.byImpact.map((item) => (
              <div key={item.impactLevel} className="bg-white rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{item._count}</p>
                <div className="mt-1">
                  <ImpactBadge level={item.impactLevel} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Tüm Kategoriler</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>

          <select
            value={impactFilter}
            onChange={(e) => setImpactFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Tüm Etki Seviyeleri</option>
            {ALL_IMPACT_LEVELS.map((l) => (
              <option key={l} value={l}>{l === "LOW" ? "Düşük" : l === "MEDIUM" ? "Orta" : l === "HIGH" ? "Yüksek" : "Kritik"}</option>
            ))}
          </select>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
        ) : updates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Radio size={40} className="mx-auto text-gray-300 mb-3" />
            <p>Henüz mevzuat güncellemesi bulunmuyor.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((u) => (
              <LegalUpdateCard
                key={u.id}
                id={u.id}
                title={u.title}
                source={u.source}
                category={u.category}
                impactLevel={u.impactLevel}
                summary={u.summary}
                publishDate={u.publishDate}
                originalUrl={u.originalUrl}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
