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
} from "lucide-react";
import ActionSidebar from "./ActionSidebar";
import PredictedBidders from "./PredictedBidders";
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

            {/* Details grid */}
            <section className="bg-white rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                İhale Detayları
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-background-alt rounded-lg">
                  <Building2 size={18} className="text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-foreground-light">İhale Kurumu</p>
                    <p className="text-sm font-medium text-foreground">
                      {tender.institution}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background-alt rounded-lg">
                  <MapPin size={18} className="text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-foreground-light">Şehir</p>
                    <p className="text-sm font-medium text-foreground">
                      {tender.city}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background-alt rounded-lg">
                  <Banknote size={18} className="text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-foreground-light">
                      Tahmini Bedel
                    </p>
                    <p className="text-sm font-bold text-primary">
                      {tender.estimatedCost}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background-alt rounded-lg">
                  <Tag size={18} className="text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-foreground-light">İhale Türü</p>
                    <p className="text-sm font-medium text-foreground">
                      {tender.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background-alt rounded-lg">
                  <Calendar size={18} className="text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-foreground-light">
                      Yayın Tarihi
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(tender.publishDate).toLocaleDateString("tr-TR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background-alt rounded-lg">
                  <Clock size={18} className="text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-foreground-light">
                      Son Başvuru Tarihi
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(tender.deadline).toLocaleDateString("tr-TR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Documents */}
            <section className="bg-white rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText size={20} className="text-primary" />
                İhale Dokümanları
              </h2>
              <div className="space-y-3">
                {tender.documents.map((doc) => (
                  <div
                    key={doc.name}
                    className="flex items-center justify-between p-3 bg-background-alt rounded-lg hover:bg-blue-50 transition-colors group"
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
            </section>

            {/* Predicted bidders */}
            <PredictedBidders
              category={tender.category}
              city={tender.city}
              budgetValue={tender.estimatedCostValue}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <ActionSidebar
              tenderId={tender.id}
              estimatedCost={tender.estimatedCost}
              daysLeft={daysLeft}
              status={tender.status}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
