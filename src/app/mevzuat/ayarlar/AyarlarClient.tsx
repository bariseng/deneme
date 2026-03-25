"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Save, Check } from "lucide-react";
import { CATEGORY_LABELS, ALL_CATEGORIES, ALL_IMPACT_LEVELS, IMPACT_LABELS } from "@/lib/legal-scanner-client";

export default function AyarlarClient() {
  const [categories, setCategories] = useState<string[]>([]);
  const [impactLevels, setImpactLevels] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/legal/alerts");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
          setImpactLevels(data.impactLevels || []);
          setIsActive(data.isActive !== false);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function toggleImpact(level: string) {
    setImpactLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/legal/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories, impactLevels, isActive }),
      });
      if (res.ok) setSaved(true);
    } catch {
      // ignore
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/mevzuat" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          Mevzuat Radarı
        </Link>

        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bell size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Bildirim Ayarları</h1>
              <p className="text-sm text-gray-500">Hangi değişikliklerden haberdar olmak istiyorsunuz?</p>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
            <div>
              <p className="font-medium text-gray-900">Bildirimleri Aç</p>
              <p className="text-sm text-gray-500">Mevzuat değişikliklerinde bildirim al</p>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`relative w-12 h-6 rounded-full transition-colors ${isActive ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? "translate-x-6" : "translate-x-0.5"}`}
              />
            </button>
          </div>

          {/* Categories */}
          <div className="mb-6">
            <h2 className="font-medium text-gray-900 mb-3">Kategoriler</h2>
            <div className="grid grid-cols-2 gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    categories.includes(cat)
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {categories.includes(cat) && <Check size={14} />}
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Impact Levels */}
          <div className="mb-6">
            <h2 className="font-medium text-gray-900 mb-3">Minimum Etki Seviyesi</h2>
            <div className="grid grid-cols-2 gap-2">
              {ALL_IMPACT_LEVELS.map((level) => {
                const cfg = IMPACT_LABELS[level];
                return (
                  <button
                    key={level}
                    onClick={() => toggleImpact(level)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                      impactLevels.includes(level)
                        ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {impactLevels.includes(level) && <Check size={14} />}
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saved ? (
              <><Check size={16} /> Kaydedildi</>
            ) : saving ? (
              "Kaydediliyor..."
            ) : (
              <><Save size={16} /> Kaydet</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
