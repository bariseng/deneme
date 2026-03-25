"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  GitCompareArrows,
  CheckCircle2,
  XCircle,
  Star,
  TrendingUp,
  Users,
  Calendar,
  MapPin,
  Award,
} from "lucide-react";
import { companies, type Company } from "@/lib/companies";
import { formatCurrency } from "@/lib/format";

export default function CompareClient() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean);

  const selected = useMemo(
    () =>
      ids
        .map((id) => companies.find((c) => c.id === id))
        .filter(Boolean) as Company[],
    [ids]
  );

  if (selected.length < 2) {
    return (
      <div className="bg-background-alt min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <GitCompareArrows
            size={48}
            className="mx-auto text-foreground-light/30 mb-3"
          />
          <h1 className="text-lg font-semibold text-foreground mb-2">
            Karşılaştırma için en az 2 firma seçin
          </h1>
          <Link
            href="/firmalar"
            className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark font-medium"
          >
            <ArrowLeft size={14} />
            Firma Listesine Dön
          </Link>
        </div>
      </div>
    );
  }

  const rows: {
    label: string;
    icon: React.ElementType;
    values: (string | number)[];
    highlight?: "max" | "min";
  }[] = [
    {
      label: "Şehir",
      icon: MapPin,
      values: selected.map((c) => c.city),
    },
    {
      label: "Kuruluş Yılı",
      icon: Calendar,
      values: selected.map((c) => c.foundedYear),
    },
    {
      label: "Çalışan Sayısı",
      icon: Users,
      values: selected.map((c) => c.employeeCount),
      highlight: "max",
    },
    {
      label: "Puan",
      icon: Star,
      values: selected.map((c) => c.rating.toFixed(1)),
      highlight: "max",
    },
    {
      label: "Kazanılan İhale",
      icon: CheckCircle2,
      values: selected.map((c) => c.wonTenderCount),
      highlight: "max",
    },
    {
      label: "Kaybedilen İhale",
      icon: XCircle,
      values: selected.map((c) => c.lostTenderCount),
      highlight: "min",
    },
    {
      label: "Aktif Başvuru",
      icon: TrendingUp,
      values: selected.map((c) => c.activeTenderCount),
    },
    {
      label: "Kazanma Oranı",
      icon: Award,
      values: selected.map((c) =>
        `%${Math.round((c.wonTenderCount / (c.wonTenderCount + c.lostTenderCount)) * 100)}`
      ),
      highlight: "max",
    },
    {
      label: "Toplam İhale Tutarı",
      icon: TrendingUp,
      values: selected.map((c) => formatCurrency(c.totalTenderAmount)),
      highlight: "max",
    },
    {
      label: "Sektörler",
      icon: Award,
      values: selected.map((c) => c.sectors.join(", ")),
    },
  ];

  function isBest(
    values: (string | number)[],
    idx: number,
    mode?: "max" | "min"
  ): boolean {
    if (!mode) return false;
    const nums = values.map((v) =>
      typeof v === "number"
        ? v
        : parseFloat(String(v).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0
    );
    const target = mode === "max" ? Math.max(...nums) : Math.min(...nums);
    return nums[idx] === target;
  }

  return (
    <div className="bg-background-alt min-h-screen">
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/firmalar"
            className="inline-flex items-center gap-1 text-sm text-blue-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Firma Listesine Dön
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <GitCompareArrows size={28} />
            Rakip Karşılaştırma
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            {selected.length} firma yan yana karşılaştırılıyor
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            {/* Company headers */}
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-xs font-medium text-foreground-light w-48">
                  Kriter
                </th>
                {selected.map((c) => (
                  <th key={c.id} className="p-4 text-center min-w-[180px]">
                    <Link
                      href={`/firmalar/${c.id}`}
                      className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {c.name}
                    </Link>
                    <div className="flex justify-center gap-2 mt-1">
                      {c.sectors.map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-primary rounded"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const Icon = row.icon;
                return (
                  <tr
                    key={row.label}
                    className="border-b border-border/50 hover:bg-background-alt transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-foreground-light">
                        <Icon size={14} />
                        <span className="text-xs font-medium">
                          {row.label}
                        </span>
                      </div>
                    </td>
                    {row.values.map((val, idx) => {
                      const best = isBest(row.values, idx, row.highlight);
                      return (
                        <td
                          key={idx}
                          className={`p-4 text-center ${
                            best
                              ? "font-bold text-primary bg-primary/5"
                              : "text-foreground"
                          }`}
                        >
                          {val}
                          {best && (
                            <span className="ml-1 text-[10px] text-accent font-normal">
                              ★
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Win/loss bars */}
        <div className="mt-6 bg-white rounded-xl border border-border p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">
            Kazanma / Kaybetme Oranı
          </h2>
          <div className="space-y-4">
            {selected.map((c) => {
              const total = c.wonTenderCount + c.lostTenderCount;
              const winPct = total > 0 ? (c.wonTenderCount / total) * 100 : 0;
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-foreground">
                      {c.name}
                    </span>
                    <span className="text-xs text-foreground-light">
                      {c.wonTenderCount}W / {c.lostTenderCount}L (%
                      {Math.round(winPct)})
                    </span>
                  </div>
                  <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                    <div
                      className="bg-accent transition-all"
                      style={{ width: `${winPct}%` }}
                    />
                    <div
                      className="bg-red-400 transition-all"
                      style={{ width: `${100 - winPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
