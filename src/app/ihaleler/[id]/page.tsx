import type { Metadata } from "next";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Building2,
  Clock,
  FileText,
  Download,
  ArrowLeft,
  Tag,
  Banknote,
  Hash,
  FolderOpen,
} from "lucide-react";
import ActionSidebar from "./ActionSidebar";
import PredictedBidders from "./PredictedBidders";
import TenderTimeline from "./TenderTimeline";
import SimilarTenders from "./SimilarTenders";
import TenderMap from "./TenderMap";
import ShareButtons from "./ShareButtons";
import AIAnalysis from "./AIAnalysis";
import { tenders } from "@/lib/data";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const tender = tenders.find((t) => t.id === id);
  if (!tender) return { title: "İhale Bulunamadı" };
  return {
    title: tender.title,
    description: tender.description,
    openGraph: {
      title: `${tender.title} | İhalePro`,
      description: tender.description,
    },
  };
}

export function generateStaticParams() {
  return tenders.map((t) => ({ id: t.id }));
}

const docCategoryLabels: Record<string, string> = {
  sartname: "İdari Şartname",
  teknik: "Teknik Şartname",
  sozlesme: "Sözleşme Taslağı",
  diger: "Diğer Belgeler",
};

const docCategoryIcons: Record<string, string> = {
  sartname: "text-primary",
  teknik: "text-orange-600",
  sozlesme: "text-purple-600",
  diger: "text-foreground-light",
};

export default async function TenderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const tender = tenders.find((t) => t.id === id);

  if (!tender) {
    notFound();
  }

  const statusStyles = {
    active: "bg-green-100 text-green-800 border-green-200",
    closed: "bg-red-100 text-red-800 border-red-200",
    upcoming: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };
  const statusLabels = {
    active: "Aktif",
    closed: "Kapandı",
    upcoming: "Yaklaşan",
  };

  const daysLeft = Math.ceil(
    (new Date(tender.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Group documents by category
  const docsByCategory = tender.documents.reduce(
    (acc, doc) => {
      const cat = doc.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc);
      return acc;
    },
    {} as Record<string, typeof tender.documents>
  );

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/ihaleler"
            className="inline-flex items-center gap-1 text-sm text-blue-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            İhale Listesine Dön
          </Link>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusStyles[tender.status]}`}
            >
              {statusLabels[tender.status]}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <Tag size={10} className="mr-1" />
              {tender.category}
            </span>
            <span className="text-xs text-blue-200">{tender.type}</span>
            <span className="inline-flex items-center gap-1 text-xs text-blue-200">
              <Hash size={12} />
              EKAP: {tender.ekapNo}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight">
            {tender.title}
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <section className="bg-white rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText size={20} className="text-primary" />
                İhale Açıklaması
              </h2>
              <p className="text-foreground-light leading-relaxed">
                {tender.description}
              </p>
            </section>

            {/* AI Analysis */}
            <AIAnalysis tender={tender} />

            {/* Timeline */}
            <TenderTimeline events={tender.timeline} />

            {/* Details grid */}
            <section className="bg-white rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                İhale Detayları
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailCard
                  icon={Building2}
                  label="İhale Kurumu"
                  value={tender.institution}
                />
                <DetailCard
                  icon={MapPin}
                  label="Şehir"
                  value={tender.city}
                />
                <DetailCard
                  icon={Banknote}
                  label="Tahmini Bedel"
                  value={tender.estimatedCost}
                  highlight
                />
                <DetailCard
                  icon={Tag}
                  label="İhale Türü"
                  value={tender.type}
                />
                <DetailCard
                  icon={Calendar}
                  label="Yayın Tarihi"
                  value={new Date(tender.publishDate).toLocaleDateString(
                    "tr-TR",
                    { year: "numeric", month: "long", day: "numeric" }
                  )}
                />
                <DetailCard
                  icon={Clock}
                  label="Son Başvuru Tarihi"
                  value={new Date(tender.deadline).toLocaleDateString(
                    "tr-TR",
                    { year: "numeric", month: "long", day: "numeric" }
                  )}
                />
              </div>
            </section>

            {/* Document Center */}
            <section className="bg-white rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FolderOpen size={20} className="text-primary" />
                Doküman İndirme Merkezi
              </h2>
              <p className="text-xs text-foreground-light mb-4">
                {tender.documents.length} dosya · Toplam{" "}
                {tender.documents
                  .reduce((s, d) => {
                    const num = parseFloat(d.size);
                    return s + (isNaN(num) ? 0 : num);
                  }, 0)
                  .toFixed(1)}{" "}
                MB
              </p>

              {Object.entries(docsByCategory).map(([cat, docs]) => (
                <div key={cat} className="mb-4 last:mb-0">
                  <h3
                    className={`text-xs font-semibold uppercase tracking-wider mb-2 ${docCategoryIcons[cat] || "text-foreground-light"}`}
                  >
                    {docCategoryLabels[cat] || cat}
                  </h3>
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <div
                        key={doc.name}
                        className="flex items-center justify-between p-3 bg-background-alt rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <FileText size={18} className="text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {doc.name}
                            </p>
                            <p className="text-xs text-foreground-light">
                              {doc.size}
                            </p>
                          </div>
                        </div>
                        <button
                          className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark font-medium transition-colors"
                          aria-label={`${doc.name} indir`}
                        >
                          <Download size={16} />
                          <span className="hidden sm:inline">İndir</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Download all */}
              <button className="mt-4 w-full py-2.5 border border-primary/20 text-primary text-sm font-medium rounded-lg hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                <Download size={16} />
                Tüm Dokümanları İndir ({tender.documents.length} dosya)
              </button>
            </section>

            {/* Map */}
            <TenderMap
              city={tender.city}
              coordinates={tender.coordinates}
            />

            {/* Predicted bidders */}
            <PredictedBidders
              category={tender.category}
              city={tender.city}
              budgetValue={tender.estimatedCostValue}
            />

            {/* Similar tenders */}
            <SimilarTenders
              currentId={tender.id}
              category={tender.category}
              institution={tender.institution}
              budgetValue={tender.estimatedCostValue}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <ActionSidebar
              tenderId={tender.id}
              tenderTitle={tender.title}
              institution={tender.institution}
              ekapNo={tender.ekapNo}
              estimatedCost={tender.estimatedCost}
              daysLeft={daysLeft}
              status={tender.status}
            />

            <ShareButtons title={tender.title} tenderId={tender.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-background-alt rounded-lg">
      <Icon size={18} className="text-primary mt-0.5" />
      <div>
        <p className="text-xs text-foreground-light">{label}</p>
        <p
          className={`text-sm font-medium ${
            highlight ? "font-bold text-primary" : "text-foreground"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
