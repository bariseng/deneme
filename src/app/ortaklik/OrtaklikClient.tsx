"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  MapPin,
  Briefcase,
  TrendingUp,
  Handshake,
  Filter,
  ArrowRight,
  Building2,
  Clock,
} from "lucide-react";

interface JvRequest {
  id: string;
  title: string;
  description: string;
  requiredSpecialty: string;
  requiredExperienceAmount: string;
  city: string;
  status: string;
  createdAt: string;
  company: { id: string; name: string; city: string | null; sector: string | null };
  tender?: { id: string; title: string; deadline: string; estimatedCost: string } | null;
  _count: { matches: number };
}

interface Stats {
  totalRequests: number;
  openRequests: number;
  matchedRequests: number;
  totalMatches: number;
  acceptedMatches: number;
}

const SPECIALTIES = [
  { value: "YAPIM", label: "Yapım İşleri" },
  { value: "MAL_ALIMI", label: "Mal Alımı" },
  { value: "HIZMET", label: "Hizmet Alımı" },
  { value: "DANISMANLIK", label: "Danışmanlık" },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Açık", color: "bg-green-100 text-green-800" },
  MATCHED: { label: "Eşleşti", color: "bg-blue-100 text-blue-800" },
  CLOSED: { label: "Kapalı", color: "bg-gray-100 text-gray-800" },
};

function formatCurrency(val: string | number) {
  return Number(val).toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
}

export default function OrtaklikClient() {
  const [requests, setRequests] = useState<JvRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCity, setFilterCity] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCity) params.set("city", filterCity);
      if (filterSpecialty) params.set("specialty", filterSpecialty);
      if (filterStatus) params.set("status", filterStatus);

      const [reqRes, statsRes] = await Promise.all([
        fetch(`/api/jv-matching?${params}`),
        fetch("/api/jv-matching?action=stats"),
      ]);

      if (reqRes.ok) setRequests(await reqRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filterCity, filterSpecialty, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = requests.filter((r) =>
    searchTerm
      ? r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.company.name.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Handshake className="text-blue-600" size={32} />
              İş Ortaklığı Eşleştirme
            </h1>
            <p className="text-gray-500 mt-1">
              4734 sayılı Kanun kapsamında iş ortaklığı partner bulma platformu
            </p>
          </div>
          <Link
            href="/ortaklik/yeni"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Ortak Arıyorum
          </Link>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Toplam İlan", value: stats.totalRequests, icon: Briefcase, color: "text-blue-600" },
              { label: "Açık İlan", value: stats.openRequests, icon: Clock, color: "text-green-600" },
              { label: "Eşleşen", value: stats.matchedRequests, icon: Handshake, color: "text-purple-600" },
              { label: "Toplam Eşleşme", value: stats.totalMatches, icon: Users, color: "text-orange-600" },
              { label: "Kabul Edilen", value: stats.acceptedMatches, icon: TrendingUp, color: "text-emerald-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon size={18} className={s.color} />
                  <span className="text-sm text-gray-500">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={18} className="text-gray-400" />
            <span className="font-medium text-gray-700">Filtreler</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="İlan veya firma ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Tüm Sektörler</option>
              {SPECIALTIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Şehir..."
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Tüm Durumlar</option>
              <option value="OPEN">Açık</option>
              <option value="MATCHED">Eşleşti</option>
              <option value="CLOSED">Kapalı</option>
            </select>
          </div>
        </div>

        {/* Request List */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Handshake size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">Henüz ilan bulunmuyor</h3>
            <p className="text-gray-400 mt-1">İlk iş ortaklığı ilanınızı oluşturun</p>
            <Link
              href="/ortaklik/yeni"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium mt-4 hover:bg-blue-700"
            >
              <Plus size={20} />
              İlan Oluştur
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r) => {
              const statusInfo = STATUS_MAP[r.status] || STATUS_MAP.OPEN;
              const specLabel = SPECIALTIES.find((s) => s.value === r.requiredSpecialty)?.label || r.requiredSpecialty;

              return (
                <Link
                  key={r.id}
                  href={`/ortaklik/${r.id}`}
                  className="block bg-white rounded-xl border hover:border-blue-300 hover:shadow-md transition-all p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{r.title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm line-clamp-2 mb-3">{r.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Building2 size={14} />
                          {r.company.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {r.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase size={14} />
                          {specLabel}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp size={14} />
                          {formatCurrency(r.requiredExperienceAmount)}
                        </span>
                      </div>
                      {r.tender && (
                        <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
                          İhale: {r.tender.title}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Users size={14} />
                        {r._count.matches} eşleşme
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(r.createdAt).toLocaleDateString("tr-TR")}
                      </span>
                      <ArrowRight size={18} className="text-blue-500 mt-2" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
