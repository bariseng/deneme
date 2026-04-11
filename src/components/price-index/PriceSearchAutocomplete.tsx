"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface SearchResult {
  item: string;
  itemLabel: string;
  sector: string;
  unit: string;
  avgPrice?: number | string;
  minPrice?: number | string;
  maxPrice?: number | string;
}

interface PriceSearchAutocompleteProps {
  sector?: string;
  onSelect: (item: SearchResult) => void;
  placeholder?: string;
}

export default function PriceSearchAutocomplete({
  sector,
  onSelect,
  placeholder = "Birim fiyat ara (beton, demir, çelik...)",
}: PriceSearchAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (sector) params.set("sector", sector);
        const res = await fetch(`/api/price-index/search?${params}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setIsOpen(data.length > 0);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, sector]);

  const handleSelect = (item: SearchResult) => {
    setQuery(item.itemLabel);
    setIsOpen(false);
    onSelect(item);
  };

  const SECTOR_LABELS: Record<string, string> = {
    YAPIM: "Yapım",
    HIZMET: "Hizmet",
    MAL_ALIMI: "Mal",
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-sm text-gray-500 text-center">Aranıyor...</div>
          ) : (
            results.map((r) => (
              <button
                key={r.item}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{r.itemLabel}</p>
                    <p className="text-xs text-gray-400">{r.unit} · {SECTOR_LABELS[r.sector] || r.sector}</p>
                  </div>
                  {r.avgPrice ? (
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-semibold text-blue-700">
                        {Number(r.avgPrice).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {Number(r.minPrice).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} – {Number(r.maxPrice).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 ml-3">Fiyat yok</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
