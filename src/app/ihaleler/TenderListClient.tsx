"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  ListFilter,
  Calendar,
  ChevronsUpDown,
  Hash,
  Loader2,
} from "lucide-react";
import TenderCard from "@/components/TenderCard";
import type { Tender } from "@/lib/data";
import {
  categories,
  cities,
  institutionTypes,
} from "@/lib/data";
import { fetchTenders, type ApiPagination } from "@/lib/api-client";
import { useDebounce } from "@/lib/hooks";
import { formatCurrency } from "@/lib/format";

type SortOption = "newest" | "deadline" | "cost-high" | "cost-low";

const ITEMS_PER_PAGE = 20;

const BUDGET_MIN = 0;
const BUDGET_MAX = 10_000_000_000;
const BUDGET_STEP = 5_000_000;

export default function TenderListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [searchInput, setSearchInput] = useState(
    searchParams.get("q") || ""
  );
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("kategori") || ""
  );
  const [selectedCity, setSelectedCity] = useState(
    searchParams.get("il") || ""
  );
  const [selectedStatus, setSelectedStatus] = useState(
    searchParams.get("durum") || ""
  );
  const [selectedInstitutionType, setSelectedInstitutionType] = useState(
    searchParams.get("kurum") || ""
  );
  const [ekapNo, setEkapNo] = useState(
    searchParams.get("ekap") || ""
  );
  const [budgetMin, setBudgetMin] = useState(
    Number(searchParams.get("bmin")) || BUDGET_MIN
  );
  const [budgetMax, setBudgetMax] = useState(
    Number(searchParams.get("bmax")) || BUDGET_MAX
  );
  const [dateFrom, setDateFrom] = useState(
    searchParams.get("tarih_bas") || ""
  );
  const [dateTo, setDateTo] = useState(
    searchParams.get("tarih_bit") || ""
  );
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get("sirala") as SortOption) || "newest"
  );
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("sayfa")) || 1
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  // API state
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [pagination, setPagination] = useState<ApiPagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
    hasNext: false,
  });
  const [loading, setLoading] = useState(true);

  // Debounce search input
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync URL with filters
  const updateURL = useCallback(
    (overrides: Record<string, string | number>) => {
      const params = new URLSearchParams();
      const state: Record<string, string | number> = {
        q: debouncedSearch,
        kategori: selectedCategory,
        il: selectedCity,
        durum: selectedStatus,
        kurum: selectedInstitutionType,
        ekap: ekapNo,
        bmin: budgetMin,
        bmax: budgetMax,
        tarih_bas: dateFrom,
        tarih_bit: dateTo,
        sirala: sortBy,
        sayfa: currentPage,
        ...overrides,
      };

      for (const [key, val] of Object.entries(state)) {
        const strVal = String(val);
        // Skip default values
        if (key === "bmin" && Number(val) === BUDGET_MIN) continue;
        if (key === "bmax" && Number(val) === BUDGET_MAX) continue;
        if (key === "sirala" && val === "newest") continue;
        if (key === "sayfa" && Number(val) === 1) continue;
        if (strVal) params.set(key, strVal);
      }

      const qs = params.toString();
      router.replace(`/ihaleler${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [
      debouncedSearch,
      selectedCategory,
      selectedCity,
      selectedStatus,
      selectedInstitutionType,
      ekapNo,
      budgetMin,
      budgetMax,
      dateFrom,
      dateTo,
      sortBy,
      currentPage,
      router,
    ]
  );

  // Update URL when filters change
  useEffect(() => {
    updateURL({});
  }, [updateURL]);

  // Map sort option to API sort params
  const sortMapping: Record<SortOption, { sort: string; order: "asc" | "desc" }> = {
    newest: { sort: "publishDate", order: "desc" },
    deadline: { sort: "deadline", order: "asc" },
    "cost-high": { sort: "estimatedCost", order: "desc" },
    "cost-low": { sort: "estimatedCost", order: "asc" },
  };

  // Fetch tenders from API when filters change
  useEffect(() => {
    setLoading(true);
    const { sort, order } = sortMapping[sortBy] ?? sortMapping.newest;
    fetchTenders({
      q: debouncedSearch && debouncedSearch.length >= 3 ? debouncedSearch : undefined,
      city: selectedCity || undefined,
      type: selectedCategory || undefined,
      status: selectedStatus || undefined,
      budgetMin: budgetMin > BUDGET_MIN ? budgetMin : undefined,
      budgetMax: budgetMax < BUDGET_MAX ? budgetMax : undefined,
      sort,
      order,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    })
      .then(({ tenders: t, pagination: p }) => {
        setTenders(t);
        setPagination(p);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    selectedCategory,
    selectedCity,
    selectedStatus,
    selectedInstitutionType,
    ekapNo,
    budgetMin,
    budgetMax,
    dateFrom,
    dateTo,
    sortBy,
    currentPage,
  ]);

  // Reset to page 1 when filters (not page) change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearch,
    selectedCategory,
    selectedCity,
    selectedStatus,
    selectedInstitutionType,
    ekapNo,
    budgetMin,
    budgetMax,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  const totalPages = pagination.pages;
  const safePage = Math.min(currentPage, totalPages || 1);

  const clearFilters = () => {
    setSearchInput("");
    setSelectedCategory("");
    setSelectedCity("");
    setSelectedStatus("");
    setSelectedInstitutionType("");
    setEkapNo("");
    setBudgetMin(BUDGET_MIN);
    setBudgetMax(BUDGET_MAX);
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchInput ||
    selectedCategory ||
    selectedCity ||
    selectedStatus ||
    selectedInstitutionType ||
    ekapNo ||
    budgetMin > BUDGET_MIN ||
    budgetMax < BUDGET_MAX ||
    dateFrom ||
    dateTo;

  const activeFilterCount = [
    searchInput,
    selectedCategory,
    selectedCity,
    selectedStatus,
    selectedInstitutionType,
    ekapNo,
    budgetMin > BUDGET_MIN ? "1" : "",
    budgetMax < BUDGET_MAX ? "1" : "",
    dateFrom,
    dateTo,
  ].filter(Boolean).length;

  // Pagination helpers
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const selectClass =
    "h-11 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white appearance-none cursor-pointer";

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Page header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            İhale Bul
          </h1>
          <p className="text-blue-200">
            Yapay zeka destekli arama ile size en uygun ihaleleri bulun
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main search bar */}
        <div className="bg-white rounded-xl border border-border p-4 mb-4 shadow-sm">
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
                placeholder="İhale adı, kurum adı veya açıklama ara... (min. 3 karakter)"
                className="w-full h-12 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                aria-label="İhale ara"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-light hover:text-foreground"
                  aria-label="Aramayı temizle"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`h-12 px-4 flex items-center gap-2 text-sm font-medium border rounded-lg transition-colors ${
                filtersOpen
                  ? "bg-primary text-white border-primary"
                  : "border-border hover:bg-gray-50"
              }`}
              aria-expanded={filtersOpen}
              aria-label="Gelişmiş filtreler"
            >
              <SlidersHorizontal size={16} />
              Filtreler
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-secondary text-white rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Search hint */}
          {searchInput.length > 0 && searchInput.length < 3 && (
            <p className="text-xs text-foreground-light mt-2">
              En az 3 karakter girin...
            </p>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {filtersOpen && (
          <div className="bg-white rounded-xl border border-border p-5 mb-4 shadow-sm animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* City */}
              <div>
                <label
                  htmlFor="filter-city"
                  className="block text-xs font-medium text-foreground-light mb-1.5"
                >
                  İl
                </label>
                <select
                  id="filter-city"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className={selectClass + " w-full"}
                >
                  <option value="">Tüm İller (81)</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category / İhale Türü */}
              <div>
                <label
                  htmlFor="filter-category"
                  className="block text-xs font-medium text-foreground-light mb-1.5"
                >
                  İhale Türü
                </label>
                <select
                  id="filter-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={selectClass + " w-full"}
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map((cat) => (
                    <option key={cat.slug} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Institution Type */}
              <div>
                <label
                  htmlFor="filter-institution"
                  className="block text-xs font-medium text-foreground-light mb-1.5"
                >
                  Kurum Türü
                </label>
                <select
                  id="filter-institution"
                  value={selectedInstitutionType}
                  onChange={(e) =>
                    setSelectedInstitutionType(e.target.value)
                  }
                  className={selectClass + " w-full"}
                >
                  <option value="">Tüm Kurumlar</option>
                  {institutionTypes.map((it) => (
                    <option key={it.value} value={it.value}>
                      {it.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label
                  htmlFor="filter-status"
                  className="block text-xs font-medium text-foreground-light mb-1.5"
                >
                  Durum
                </label>
                <select
                  id="filter-status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className={selectClass + " w-full"}
                >
                  <option value="">Tüm Durumlar</option>
                  <option value="active">Aktif</option>
                  <option value="closed">Kapandı</option>
                  <option value="upcoming">Yaklaşan</option>
                </select>
              </div>

              {/* EKAP No */}
              <div>
                <label
                  htmlFor="filter-ekap"
                  className="block text-xs font-medium text-foreground-light mb-1.5"
                >
                  EKAP İhale No
                </label>
                <div className="relative">
                  <Hash
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light"
                  />
                  <input
                    id="filter-ekap"
                    type="text"
                    value={ekapNo}
                    onChange={(e) => setEkapNo(e.target.value)}
                    placeholder="ör: 2026/100234"
                    className="w-full h-11 pl-9 pr-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Budget Min */}
              <div>
                <label
                  htmlFor="filter-budget-min"
                  className="block text-xs font-medium text-foreground-light mb-1.5"
                >
                  Min. Bütçe
                </label>
                <input
                  id="filter-budget-min"
                  type="range"
                  min={BUDGET_MIN}
                  max={BUDGET_MAX}
                  step={BUDGET_STEP}
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary mt-2"
                />
                <p className="text-xs text-foreground-light mt-1">
                  {formatCurrency(budgetMin)}
                </p>
              </div>

              {/* Budget Max */}
              <div>
                <label
                  htmlFor="filter-budget-max"
                  className="block text-xs font-medium text-foreground-light mb-1.5"
                >
                  Max. Bütçe
                </label>
                <input
                  id="filter-budget-max"
                  type="range"
                  min={BUDGET_MIN}
                  max={BUDGET_MAX}
                  step={BUDGET_STEP}
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary mt-2"
                />
                <p className="text-xs text-foreground-light mt-1">
                  {formatCurrency(budgetMax)}
                </p>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-xs font-medium text-foreground-light mb-1.5">
                  Son Başvuru Tarihi
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Calendar
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-light pointer-events-none"
                    />
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full h-11 pl-8 pr-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-label="Başlangıç tarihi"
                    />
                  </div>
                  <span className="text-foreground-light text-xs">–</span>
                  <div className="relative flex-1">
                    <Calendar
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-light pointer-events-none"
                    />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full h-11 pl-8 pr-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-label="Bitiş tarihi"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Clear filters in panel */}
            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-border">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm text-error hover:text-red-700 transition-colors"
                >
                  <X size={14} />
                  Tüm Filtreleri Temizle
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sort bar + result count */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <p className="text-sm text-foreground-light">
            <span className="font-semibold text-foreground">
              {pagination.total}
            </span>{" "}
            ihale bulundu
            {debouncedSearch && debouncedSearch.length >= 3 && (
              <span>
                {" "}
                &quot;<span className="text-primary">{debouncedSearch}</span>
                &quot; için
              </span>
            )}
          </p>

          <div className="flex items-center gap-2">
            <ListFilter size={16} className="text-foreground-light" />
            <span className="text-sm text-foreground-light">Sırala:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-9 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              aria-label="Sıralama seçeneği"
            >
              <option value="newest">Tarihe Göre (Yeni → Eski)</option>
              <option value="deadline">Son Başvuru Tarihine Göre</option>
              <option value="cost-high">Bütçeye Göre (Büyük → Küçük)</option>
              <option value="cost-low">Bütçeye Göre (Küçük → Büyük)</option>
            </select>
          </div>
        </div>

        {/* Active filter badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedCity && (
              <FilterBadge
                label={`İl: ${selectedCity}`}
                onRemove={() => setSelectedCity("")}
              />
            )}
            {selectedCategory && (
              <FilterBadge
                label={`Tür: ${selectedCategory}`}
                onRemove={() => setSelectedCategory("")}
              />
            )}
            {selectedInstitutionType && (
              <FilterBadge
                label={`Kurum: ${institutionTypes.find((i) => i.value === selectedInstitutionType)?.label}`}
                onRemove={() => setSelectedInstitutionType("")}
              />
            )}
            {selectedStatus && (
              <FilterBadge
                label={`Durum: ${selectedStatus === "active" ? "Aktif" : selectedStatus === "closed" ? "Kapandı" : "Yaklaşan"}`}
                onRemove={() => setSelectedStatus("")}
              />
            )}
            {ekapNo && (
              <FilterBadge
                label={`EKAP: ${ekapNo}`}
                onRemove={() => setEkapNo("")}
              />
            )}
            {(budgetMin > BUDGET_MIN || budgetMax < BUDGET_MAX) && (
              <FilterBadge
                label={`Bütçe: ${formatCurrency(budgetMin)} - ${formatCurrency(budgetMax)}`}
                onRemove={() => {
                  setBudgetMin(BUDGET_MIN);
                  setBudgetMax(BUDGET_MAX);
                }}
              />
            )}
            {dateFrom && (
              <FilterBadge
                label={`Tarih başlangıç: ${dateFrom}`}
                onRemove={() => setDateFrom("")}
              />
            )}
            {dateTo && (
              <FilterBadge
                label={`Tarih bitiş: ${dateTo}`}
                onRemove={() => setDateTo("")}
              />
            )}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-border p-5 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : tenders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
            {tenders.map((tender) => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <Search
              size={48}
              className="mx-auto text-foreground-light mb-4"
            />
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
            className="flex items-center justify-center gap-1 sm:gap-2"
            aria-label="Sayfalama"
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Önceki sayfa"
            >
              <ChevronLeft size={18} />
            </button>

            {getPageNumbers().map((page, idx) =>
              page === "..." ? (
                <span
                  key={`dots-${idx}`}
                  className="flex items-center justify-center w-10 h-10 text-sm text-foreground-light"
                >
                  <ChevronsUpDown size={14} />
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page as number)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    page === safePage
                      ? "bg-primary text-white"
                      : "border border-border hover:bg-gray-50"
                  }`}
                  aria-label={`Sayfa ${page}`}
                  aria-current={page === safePage ? "page" : undefined}
                >
                  {page}
                </button>
              )
            )}

            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={safePage === totalPages}
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Sonraki sayfa"
            >
              <ChevronRight size={18} />
            </button>

            <span className="ml-3 text-sm text-foreground-light hidden sm:inline">
              Sayfa {safePage} / {totalPages}
            </span>
          </nav>
        )}
      </div>
    </div>
  );
}

/** Small reusable badge for active filters */
function FilterBadge({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
      {label}
      <button
        onClick={onRemove}
        className="hover:text-primary-dark transition-colors"
        aria-label={`${label} filtresini kaldır`}
      >
        <X size={12} />
      </button>
    </span>
  );
}
