"use client";

import { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  ListFilter,
} from "lucide-react";
import TenderCard from "@/components/TenderCard";
import { tenders, categories, cities } from "@/lib/data";

type SortOption = "newest" | "deadline" | "cost-high" | "cost-low";

export default function TenderListClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const itemsPerPage = 6;

  const filteredTenders = useMemo(() => {
    let result = [...tenders];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.institution.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) {
      result = result.filter((t) =>
        t.category.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }
    if (selectedCity) {
      result = result.filter((t) => t.city === selectedCity);
    }
    if (selectedStatus) {
      result = result.filter((t) => t.status === selectedStatus);
    }

    switch (sortBy) {
      case "deadline":
        result.sort(
          (a, b) =>
            new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );
        break;
      case "cost-high":
        result.sort((a, b) => {
          const costA = parseFloat(a.estimatedCost.replace(/[^0-9]/g, ""));
          const costB = parseFloat(b.estimatedCost.replace(/[^0-9]/g, ""));
          return costB - costA;
        });
        break;
      case "cost-low":
        result.sort((a, b) => {
          const costA = parseFloat(a.estimatedCost.replace(/[^0-9]/g, ""));
          const costB = parseFloat(b.estimatedCost.replace(/[^0-9]/g, ""));
          return costA - costB;
        });
        break;
      default:
        result.sort(
          (a, b) =>
            new Date(b.publishDate).getTime() -
            new Date(a.publishDate).getTime()
        );
    }

    return result;
  }, [searchQuery, selectedCategory, selectedCity, selectedStatus, sortBy]);

  const totalPages = Math.ceil(filteredTenders.length / itemsPerPage);
  const paginatedTenders = filteredTenders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedCity("");
    setSelectedStatus("");
    setSortBy("newest");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery || selectedCategory || selectedCity || selectedStatus;

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Page header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            İhale Listesi
          </h1>
          <p className="text-blue-200">
            {filteredTenders.length} ihale bulundu
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and filter bar */}
        <div className="bg-white rounded-xl border border-border p-4 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="İhale adı veya kurum ara..."
                className="w-full h-11 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                aria-label="İhale ara"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-11 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                aria-label="Kategori filtrele"
              >
                <option value="">Tüm Kategoriler</option>
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-11 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                aria-label="Şehir filtrele"
              >
                <option value="">Tüm Şehirler</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-11 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                aria-label="Durum filtrele"
              >
                <option value="">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="closed">Kapandı</option>
                <option value="upcoming">Yaklaşan</option>
              </select>

              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="lg:hidden h-11 px-3 flex items-center gap-1 text-sm border border-border rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="Filtreleri göster"
              >
                <SlidersHorizontal size={16} />
                Filtreler
              </button>
            </div>
          </div>

          {/* Sort and active filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 flex-wrap">
              <ListFilter size={16} className="text-foreground-light" />
              <span className="text-sm text-foreground-light">Sırala:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-8 px-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                aria-label="Sıralama seçeneği"
              >
                <option value="newest">En Yeni</option>
                <option value="deadline">Son Tarihe Göre</option>
                <option value="cost-high">Bedel (Yüksek → Düşük)</option>
                <option value="cost-low">Bedel (Düşük → Yüksek)</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-error hover:text-red-700 transition-colors"
              >
                <X size={14} />
                Filtreleri Temizle
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {paginatedTenders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {paginatedTenders.map((tender) => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <Search size={48} className="mx-auto text-foreground-light mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              İhale bulunamadı
            </h3>
            <p className="text-sm text-foreground-light mb-4">
              Arama kriterlerinize uygun ihale bulunamadı. Filtreleri
              değiştirmeyi deneyin.
            </p>
            <button
              onClick={clearFilters}
              className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav
            className="flex items-center justify-center gap-2"
            aria-label="Sayfalama"
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Önceki sayfa"
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    page === currentPage
                      ? "bg-primary text-white"
                      : "border border-border hover:bg-gray-50"
                  }`}
                  aria-label={`Sayfa ${page}`}
                  aria-current={page === currentPage ? "page" : undefined}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Sonraki sayfa"
            >
              <ChevronRight size={18} />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
