"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FileCheck,
  Trash2,
  Building2,
  Calendar,
  MapPin,
  Search,
} from "lucide-react";
import { tenders } from "@/lib/data";
import {
  useUserStore,
  type ApplicationStatus,
} from "@/lib/store";
import {
  ApplicationStatusBadge,
  EmptyState,
} from "./DashboardClient";

export default function AppliedTenders() {
  const { applications, removeApplication, updateApplicationStatus } =
    useUserStore();
  const [statusFilter, setStatusFilter] = useState<
    "all" | ApplicationStatus
  >("all");

  const filtered = useMemo(() => {
    const enriched = applications
      .map((app) => ({
        ...app,
        tender: tenders.find((t) => t.id === app.tenderId),
      }))
      .filter((a) => a.tender);

    if (statusFilter === "all") return enriched;
    return enriched.filter((a) => a.status === statusFilter);
  }, [applications, statusFilter]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
      ),
    [filtered]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileCheck size={20} className="text-primary" />
            Başvurduğum İhaleler
          </h2>
          <p className="text-sm text-foreground-light">
            {applications.length} başvuru
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(
            [
              { key: "all", label: "Tümü" },
              { key: "pending", label: "Beklemede" },
              { key: "won", label: "Kazandı" },
              { key: "lost", label: "Kaybetti" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === f.key
                  ? "bg-primary text-white"
                  : "bg-white text-foreground-light border border-border hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map((app) => {
            const tender = app.tender!;
            return (
              <div
                key={app.tenderId}
                className="bg-white rounded-xl border border-border p-4 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <ApplicationStatusBadge status={app.status} />
                      <span className="text-xs text-foreground-light">
                        Başvuru:{" "}
                        {new Date(app.appliedAt).toLocaleDateString(
                          "tr-TR"
                        )}
                      </span>
                    </div>

                    <Link
                      href={`/ihaleler/${tender.id}`}
                      className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                    >
                      {tender.title}
                    </Link>

                    <div className="flex items-center gap-4 mt-1.5 text-xs text-foreground-light flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 size={12} />
                        {tender.institution}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {tender.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Son:{" "}
                        {new Date(tender.deadline).toLocaleDateString(
                          "tr-TR"
                        )}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-primary mt-2">
                      {tender.estimatedCost}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex flex-col gap-2">
                    {/* Status changer (demo) */}
                    <select
                      value={app.status}
                      onChange={(e) =>
                        updateApplicationStatus(
                          app.tenderId,
                          e.target.value as ApplicationStatus
                        )
                      }
                      className="h-8 px-2 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-label="Başvuru durumunu değiştir"
                    >
                      <option value="pending">Beklemede</option>
                      <option value="won">Kazandı</option>
                      <option value="lost">Kaybetti</option>
                    </select>
                    <button
                      onClick={() => removeApplication(app.tenderId)}
                      className="flex items-center justify-center gap-1 h-8 px-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      aria-label="Başvuruyu sil"
                    >
                      <Trash2 size={12} />
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border p-8">
          <EmptyState
            icon={FileCheck}
            message="Başvuru bulunamadı"
            sub="İhale detay sayfalarından ihalelere başvurabilirsiniz."
          />
          <div className="text-center mt-4">
            <Link
              href="/ihaleler"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Search size={16} />
              İhale Bul
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
