"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  MapPin,
  TrendingUp,
  Award,
  Star,
  ChevronRight,
  BarChart3,
  Users,
  GitCompareArrows,
} from "lucide-react";
import { companies } from "@/lib/companies";
import { formatCurrency } from "@/lib/format";
import { useDebounce } from "@/lib/hooks";

export default function CompanyListClient() {
  const [searchInput, setSearchInput] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const debouncedSearch = useDebounce(searchInput, 300);

  const allSectors = useMemo(() => {
    const s = new Set<string>();
    companies.forEach((c) => c.sectors.forEach((sec) => s.add(sec)));
    return Array.from(s).sort();
  }, []);

  const filtered = useMemo(() => {
    let result = [...companies];
    if (debouncedSearch && debouncedSearch.length >= 2) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.taxNo.includes(q) ||
          c.city.toLowerCase().includes(q)
      );
    }
    if (sectorFilter) {
      result = result.filter((c) => c.sectors.includes(sectorFilter));
    }
    return result;
  }, [debouncedSearch, sectorFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
          ? [...prev, id]
          : prev
    );
  };

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            Rakip Analizi & Firma Arama
          </h1>
          <p className="text-blue-200 text-sm">
            Firma profillerini inceleyin, rakipleri karşılaştırın
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search bar */}
        <div className="bg-white rounded-xl border border-border p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Firma adı veya vergi numarası ile ara..."
                className="w-full h-12 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                aria-label="Firma ara"
              />
            </div>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="h-12 px-3 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Tüm Sektörler</option>
              {allSectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Compare bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <p className="text-sm text-foreground-light">
                <span className="font-medium text-foreground">
                  {selectedIds.length}
                </span>{" "}
                firma seçildi (maks. 3)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-foreground-light hover:text-foreground"
                >
                  Temizle
                </button>
                <Link
                  href={`/firmalar/karsilastir?ids=${selectedIds.join(",")}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <GitCompareArrows size={16} />
                  Karşılaştır
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <p className="text-sm text-foreground-light mb-4">
          {filtered.length} firma bulundu
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((company) => {
            const isSelected = selectedIds.includes(company.id);
            return (
              <div
                key={company.id}
                className={`bg-white rounded-xl border p-5 transition-all ${
                  isSelected
                    ? "border-primary shadow-md ring-2 ring-primary/20"
                    : "border-border hover:border-primary/20 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/firmalar/${company.id}`}
                      className="text-base font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {company.name}
                    </Link>
                    <div className="flex items-center gap-3 mt-1 text-xs text-foreground-light">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {company.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {company.employeeCount} çalışan
                      </span>
                      <span className="flex items-center gap-1">
                        <Star size={12} className="text-yellow-500" />
                        {company.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleSelect(company.id)}
                    className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      isSelected
                        ? "bg-primary text-white border-primary"
                        : "text-primary border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    {isSelected ? "Seçildi" : "Seç"}
                  </button>
                </div>

                {/* Sectors */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {company.sectors.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-primary rounded-full"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-background-alt rounded-lg p-2 text-center">
                    <p className="text-xs text-foreground-light">
                      Kazanılan
                    </p>
                    <p className="text-sm font-bold text-accent">
                      {company.wonTenderCount}
                    </p>
                  </div>
                  <div className="bg-background-alt rounded-lg p-2 text-center">
                    <p className="text-xs text-foreground-light">Aktif</p>
                    <p className="text-sm font-bold text-primary">
                      {company.activeTenderCount}
                    </p>
                  </div>
                  <div className="bg-background-alt rounded-lg p-2 text-center">
                    <p className="text-xs text-foreground-light">
                      Toplam Tutar
                    </p>
                    <p className="text-xs font-bold text-foreground truncate">
                      {formatCurrency(company.totalTenderAmount)}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/firmalar/${company.id}`}
                  className="flex items-center justify-center gap-1 w-full py-2 text-sm font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  Firma Profilini Gör
                  <ChevronRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <Building2
              size={48}
              className="mx-auto text-foreground-light/30 mb-3"
            />
            <p className="text-sm font-medium text-foreground-light">
              Firma bulunamadı
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
