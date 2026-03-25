"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  Users,
  Calendar,
  TrendingUp,
  Award,
  FileText,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { companies, sectorMarketData } from "@/lib/companies";
import { formatCurrency, formatDateTR } from "@/lib/format";
import PieChart from "../PieChart";

export default function CompanyProfileClient({
  companyId,
}: {
  companyId: string;
}) {
  const company = companies.find((c) => c.id === companyId)!;
  const winRate = Math.round(
    (company.wonTenderCount /
      (company.wonTenderCount + company.lostTenderCount)) *
      100
  );

  const resultStyles = {
    won: { bg: "bg-green-100 text-green-800", label: "Kazandı" },
    lost: { bg: "bg-red-100 text-red-800", label: "Kaybetti" },
    pending: { bg: "bg-yellow-100 text-yellow-800", label: "Beklemede" },
  };

  const primarySector = company.sectors[0];
  const marketData = sectorMarketData[primarySector];

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/firmalar"
            className="inline-flex items-center gap-1 text-sm text-blue-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Firma Listesine Dön
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
              <Building2 size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {company.name}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-blue-200 text-sm flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {company.city}
                </span>
                <span className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400" />
                  {company.rating.toFixed(1)}
                </span>
                <span>VKN: {company.taxNo}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Kazanılan İhale",
              value: company.wonTenderCount,
              icon: CheckCircle2,
              color: "text-accent",
              bg: "bg-emerald-50",
            },
            {
              label: "Toplam Tutar",
              value: formatCurrency(company.totalTenderAmount),
              icon: TrendingUp,
              color: "text-primary",
              bg: "bg-blue-50",
              small: true,
            },
            {
              label: "Kazanma Oranı",
              value: `%${winRate}`,
              icon: Award,
              color: "text-secondary",
              bg: "bg-orange-50",
            },
            {
              label: "Aktif Başvuru",
              value: company.activeTenderCount,
              icon: Clock,
              color: "text-purple-600",
              bg: "bg-purple-50",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white rounded-xl border border-border p-4 flex items-center gap-3"
              >
                <div
                  className={`w-11 h-11 rounded-lg flex items-center justify-center ${stat.bg}`}
                >
                  <Icon size={20} className={stat.color} />
                </div>
                <div className="min-w-0">
                  <p
                    className={`font-extrabold text-foreground ${
                      stat.small ? "text-sm" : "text-2xl"
                    }`}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs text-foreground-light">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tender History */}
            <section className="bg-white rounded-xl border border-border p-5">
              <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Briefcase size={18} className="text-primary" />
                İhale Geçmişi ({company.tenderHistory.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 text-xs font-medium text-foreground-light">
                        İhale
                      </th>
                      <th className="text-left py-2 pr-4 text-xs font-medium text-foreground-light">
                        Yıl
                      </th>
                      <th className="text-left py-2 pr-4 text-xs font-medium text-foreground-light">
                        Kategori
                      </th>
                      <th className="text-right py-2 pr-4 text-xs font-medium text-foreground-light">
                        Tutar
                      </th>
                      <th className="text-center py-2 text-xs font-medium text-foreground-light">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.tenderHistory.map((h, idx) => {
                      const rs = resultStyles[h.result];
                      return (
                        <tr
                          key={idx}
                          className="border-b border-border/50 hover:bg-background-alt transition-colors"
                        >
                          <td className="py-2.5 pr-4">
                            {h.tenderId ? (
                              <Link
                                href={`/ihaleler/${h.tenderId}`}
                                className="text-foreground hover:text-primary font-medium line-clamp-1"
                              >
                                {h.tenderTitle}
                              </Link>
                            ) : (
                              <span className="text-foreground line-clamp-1">
                                {h.tenderTitle}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-foreground-light">
                            {h.year}
                          </td>
                          <td className="py-2.5 pr-4 text-foreground-light">
                            {h.category}
                          </td>
                          <td className="py-2.5 pr-4 text-right font-medium text-foreground">
                            {formatCurrency(h.amount)}
                          </td>
                          <td className="py-2.5 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${rs.bg}`}
                            >
                              {rs.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Experience Certificates */}
            <section className="bg-white rounded-xl border border-border p-5">
              <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                İş Deneyim Belgeleri
              </h2>
              <div className="space-y-3">
                {company.experienceCertificates.map((cert, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-background-alt rounded-lg"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <Award size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {cert.title}
                      </p>
                      <p className="text-xs text-foreground-light">
                        {cert.issuer} · {cert.year}
                      </p>
                    </div>
                    {cert.amount > 0 && (
                      <p className="text-sm font-bold text-primary shrink-0">
                        {formatCurrency(cert.amount)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Sector Market Share */}
            {marketData && (
              <section className="bg-white rounded-xl border border-border p-5">
                <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 size={18} className="text-primary" />
                  Sektörel Pazar Payı — {primarySector}
                </h2>
                <PieChart data={marketData} highlightCompany={company.name} />
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Company info */}
            <div className="bg-white rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Firma Bilgileri
              </h3>
              <div className="space-y-3 text-sm">
                <InfoRow
                  icon={Building2}
                  label="Vergi No"
                  value={company.taxNo}
                />
                <InfoRow
                  icon={MapPin}
                  label="Adres"
                  value={company.address}
                />
                <InfoRow
                  icon={Phone}
                  label="Telefon"
                  value={company.phone}
                />
                <InfoRow
                  icon={Mail}
                  label="E-posta"
                  value={company.email}
                />
                <InfoRow
                  icon={Globe}
                  label="Website"
                  value={company.website}
                />
                <InfoRow
                  icon={Calendar}
                  label="Kuruluş"
                  value={`${company.foundedYear}`}
                />
                <InfoRow
                  icon={Users}
                  label="Çalışan"
                  value={`${company.employeeCount} kişi`}
                />
              </div>
            </div>

            {/* Active sectors */}
            <div className="bg-white rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Aktif Sektörler
              </h3>
              <div className="space-y-2">
                {company.sectorMarketShare.map((sm) => (
                  <div key={sm.sector}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground">{sm.sector}</span>
                      <span className="text-primary font-medium">
                        %{sm.share}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(sm.share * 3, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Year-wise tender volume */}
            <div className="bg-white rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Yıllara Göre İhale Tutarı
              </h3>
              {(() => {
                const byYear = new Map<number, number>();
                company.tenderHistory.forEach((h) => {
                  byYear.set(
                    h.year,
                    (byYear.get(h.year) || 0) + h.amount
                  );
                });
                const years = Array.from(byYear.entries()).sort(
                  (a, b) => a[0] - b[0]
                );
                const maxAmount = Math.max(...years.map((y) => y[1]));
                return (
                  <div className="space-y-2">
                    {years.map(([year, amount]) => (
                      <div key={year}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-foreground font-medium">
                            {year}
                          </span>
                          <span className="text-foreground-light">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all"
                            style={{
                              width: `${(amount / maxAmount) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-foreground-light mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-foreground-light">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
