"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Handshake,
  MapPin,
  Briefcase,
  TrendingUp,
  Building2,
  Users,
  Search,
  Check,
  X,
  FileText,
  Shield,
  Loader2,
  Star,
  Zap,
} from "lucide-react";

interface MatchedCompany {
  id: string;
  name: string;
  city: string | null;
  sector: string | null;
  description: string | null;
  foundedYear: number | null;
  employeeCount: number | null;
}

interface JvMatch {
  id: string;
  matchedCompanyId: string;
  compatibilityScore: number;
  status: string;
  message: string | null;
  matchedCompany: MatchedCompany;
}

interface AgreementParty {
  id: string;
  companyId: string;
  role: string;
  sharePercent: number;
  company: { id: string; name: string };
}

interface JvAgreement {
  id: string;
  agreementType: string;
  ndaSignedAt: string | null;
  terms: unknown;
  parties: AgreementParty[];
}

interface JvRequest {
  id: string;
  title: string;
  description: string;
  requiredSpecialty: string;
  requiredExperienceAmount: string;
  city: string;
  status: string;
  createdAt: string;
  company: { id: string; name: string; city: string | null; sector: string | null; taxNumber: string };
  tender?: { id: string; title: string; deadline: string; estimatedCost: string } | null;
  matches: JvMatch[];
  agreement: JvAgreement | null;
}

const SPECIALTIES: Record<string, string> = {
  YAPIM: "Yapım İşleri",
  MAL_ALIMI: "Mal Alımı",
  HIZMET: "Hizmet Alımı",
  DANISMANLIK: "Danışmanlık",
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Açık", color: "bg-green-100 text-green-800" },
  MATCHED: { label: "Eşleşti", color: "bg-blue-100 text-blue-800" },
  CLOSED: { label: "Kapalı", color: "bg-gray-100 text-gray-800" },
};

const MATCH_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Beklemede", color: "bg-yellow-100 text-yellow-800" },
  ACCEPTED: { label: "Kabul Edildi", color: "bg-green-100 text-green-800" },
  REJECTED: { label: "Reddedildi", color: "bg-red-100 text-red-800" },
};

function formatCurrency(val: string | number) {
  return Number(val).toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
}

function scoreColor(score: number) {
  if (score >= 70) return "text-green-600 bg-green-50";
  if (score >= 40) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

export default function OrtaklikDetailClient() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [request, setRequest] = useState<JvRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAgreementForm, setShowAgreementForm] = useState(false);
  const [agreementType, setAgreementType] = useState("ADI_ORTAKLIK");

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/jv-matching/${id}`);
      if (res.ok) setRequest(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleFindMatches = async () => {
    setFinding(true);
    try {
      const res = await fetch("/api/jv-matching/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: id }),
      });
      if (res.ok) {
        await fetchDetail();
      }
    } catch {
      // ignore
    } finally {
      setFinding(false);
    }
  };

  const handleMatchAction = async (matchId: string, status: "ACCEPTED" | "REJECTED") => {
    setActionLoading(matchId);
    try {
      await fetch(`/api/jv-matching/${id}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchDetail();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateAgreement = async () => {
    if (!request) return;
    const acceptedCompanyIds = request.matches
      .filter((m) => m.status === "ACCEPTED")
      .map((m) => m.matchedCompanyId);

    if (acceptedCompanyIds.length === 0) return;

    const allPartyIds = [request.company.id, ...acceptedCompanyIds];
    const roles: Record<string, string> = { [request.company.id]: "PILOT_ORTAK" };
    acceptedCompanyIds.forEach((cid) => { roles[cid] = "OZEL_ORTAK"; });

    setActionLoading("agreement");
    try {
      await fetch(`/api/jv-matching/${id}/agreement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreementType,
          partyCompanyIds: allPartyIds,
          partyRoles: roles,
        }),
      });
      await fetchDetail();
      setShowAgreementForm(false);
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleSignNda = async () => {
    if (!request?.agreement) return;
    setActionLoading("nda");
    try {
      await fetch(`/api/jv-matching/${id}/agreement`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sign_nda", agreementId: request.agreement.id }),
      });
      await fetchDetail();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleCloseRequest = async () => {
    setActionLoading("close");
    try {
      await fetch(`/api/jv-matching/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      await fetchDetail();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;
  if (!request) return <div className="min-h-screen flex items-center justify-center text-gray-500">İlan bulunamadı</div>;

  const statusInfo = STATUS_MAP[request.status] || STATUS_MAP.OPEN;
  const acceptedMatches = request.matches.filter((m) => m.status === "ACCEPTED");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <Link
          href="/ortaklik"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={16} />
          İlanlar&apos;a Dön
        </Link>

        {/* Detail Card */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-gray-600">{request.description}</p>
            </div>
            {request.status !== "CLOSED" && (
              <button
                onClick={handleCloseRequest}
                disabled={actionLoading === "close"}
                className="text-sm text-red-600 hover:text-red-700 border border-red-200 px-4 py-2 rounded-lg"
              >
                İlanı Kapat
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <Building2 size={16} className="text-gray-400" />
              <span><strong>Firma:</strong> {request.company.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={16} className="text-gray-400" />
              <span><strong>Şehir:</strong> {request.city}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Briefcase size={16} className="text-gray-400" />
              <span><strong>Alan:</strong> {SPECIALTIES[request.requiredSpecialty]}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp size={16} className="text-gray-400" />
              <span><strong>İş Deneyim:</strong> {formatCurrency(request.requiredExperienceAmount)}</span>
            </div>
          </div>

          {request.tender && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>İlişkili İhale:</strong> {request.tender.title}
                {" | "}Son Başvuru: {new Date(request.tender.deadline).toLocaleDateString("tr-TR")}
                {request.tender.estimatedCost && ` | Yaklaşık Maliyet: ${formatCurrency(request.tender.estimatedCost)}`}
              </p>
            </div>
          )}
        </div>

        {/* Find Matches Button */}
        {request.status !== "CLOSED" && (
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleFindMatches}
              disabled={finding}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {finding ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Search size={20} />
              )}
              {finding ? "Eşleştiriliyor..." : "AI ile Eşleştir"}
            </button>
            <span className="text-sm text-gray-500">
              Sektör, şehir, iş deneyimi ve başarı oranına göre uyumlu firmalar bulunur
            </span>
          </div>
        )}

        {/* Matches */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Users size={20} className="text-blue-600" />
            Uyumlu Firmalar ({request.matches.length})
          </h2>

          {request.matches.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <Zap size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Henüz eşleşme yapılmadı. &quot;AI ile Eşleştir&quot; butonuna tıklayın.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {request.matches.map((match) => {
                const mStatus = MATCH_STATUS[match.status] || MATCH_STATUS.PENDING;
                return (
                  <div key={match.id} className="bg-white rounded-xl border p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{match.matchedCompany.name}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${mStatus.color}`}>
                            {mStatus.label}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${scoreColor(match.compatibilityScore)}`}>
                            <Star size={12} className="inline mr-1" />
                            {match.compatibilityScore}/100
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-2">
                          {match.matchedCompany.city && (
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {match.matchedCompany.city}
                            </span>
                          )}
                          {match.matchedCompany.sector && (
                            <span className="flex items-center gap-1">
                              <Briefcase size={14} />
                              {match.matchedCompany.sector}
                            </span>
                          )}
                          {match.matchedCompany.foundedYear && (
                            <span>Kuruluş: {match.matchedCompany.foundedYear}</span>
                          )}
                          {match.matchedCompany.employeeCount && (
                            <span>{match.matchedCompany.employeeCount} çalışan</span>
                          )}
                        </div>
                        {match.matchedCompany.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{match.matchedCompany.description}</p>
                        )}
                        {match.message && (
                          <p className="text-xs text-gray-400 mt-2 font-mono">{match.message}</p>
                        )}
                      </div>

                      {match.status === "PENDING" && request.status !== "CLOSED" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMatchAction(match.id, "ACCEPTED")}
                            disabled={actionLoading === match.id}
                            className="inline-flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            <Check size={16} />
                            Kabul
                          </button>
                          <button
                            onClick={() => handleMatchAction(match.id, "REJECTED")}
                            disabled={actionLoading === match.id}
                            className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm hover:bg-red-200 disabled:opacity-50"
                          >
                            <X size={16} />
                            Reddet
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Agreement Section */}
        {acceptedMatches.length > 0 && !request.agreement && request.status !== "CLOSED" && (
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <FileText size={20} className="text-blue-600" />
              Anlaşma Oluştur
            </h2>
            {!showAgreementForm ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  {acceptedMatches.length} firma kabul edildi. Şimdi iş ortaklığı anlaşması oluşturabilirsiniz.
                </p>
                <button
                  onClick={() => setShowAgreementForm(true)}
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700"
                >
                  <Handshake size={16} />
                  Anlaşma Oluştur
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ortaklık Tipi</label>
                  <select
                    value={agreementType}
                    onChange={(e) => setAgreementType(e.target.value)}
                    className="border rounded-lg px-4 py-2 text-sm w-full sm:w-64"
                  >
                    <option value="ADI_ORTAKLIK">Adi Ortaklık</option>
                    <option value="KONSORSIYUM">Konsorsiyum</option>
                  </select>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Taraflar:</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">Pilot Ortak</span>
                      {request.company.name}
                    </li>
                    {acceptedMatches.map((m) => (
                      <li key={m.id} className="flex items-center gap-2">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">Özel Ortak</span>
                        {m.matchedCompany.name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateAgreement}
                    disabled={actionLoading === "agreement"}
                    className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                  >
                    {actionLoading === "agreement" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Anlaşmayı Oluştur
                  </button>
                  <button
                    onClick={() => setShowAgreementForm(false)}
                    className="px-6 py-2.5 border rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Existing Agreement */}
        {request.agreement && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Shield size={20} className="text-green-600" />
              İş Ortaklığı Anlaşması
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-500">Ortaklık Tipi</span>
                <p className="font-medium">
                  {request.agreement.agreementType === "ADI_ORTAKLIK" ? "Adi Ortaklık" : "Konsorsiyum"}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">NDA Durumu</span>
                <p className="font-medium">
                  {request.agreement.ndaSignedAt ? (
                    <span className="text-green-600">
                      İmzalandı ({new Date(request.agreement.ndaSignedAt).toLocaleDateString("tr-TR")})
                    </span>
                  ) : (
                    <span className="text-yellow-600">İmzalanmadı</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Taraf Sayısı</span>
                <p className="font-medium">{request.agreement.parties.length} firma</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Taraflar:</h4>
              <div className="space-y-2">
                {request.agreement.parties.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        p.role === "PILOT_ORTAK" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"
                      }`}>
                        {p.role === "PILOT_ORTAK" ? "Pilot Ortak" : "Özel Ortak"}
                      </span>
                      <span className="font-medium">{p.company.name}</span>
                    </div>
                    <span className="text-gray-500">%{p.sharePercent.toFixed(0)} pay</span>
                  </div>
                ))}
              </div>
            </div>

            {!request.agreement.ndaSignedAt && (
              <button
                onClick={handleSignNda}
                disabled={actionLoading === "nda"}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading === "nda" ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                NDA İmzala
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
