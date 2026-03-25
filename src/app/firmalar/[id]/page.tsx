import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { companies } from "@/lib/companies";
import CompanyProfileClient from "./CompanyProfileClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const company = companies.find((c) => c.id === id);
  if (!company) return { title: "Firma Bulunamadı" };
  return {
    title: `${company.name} - Rakip Analizi`,
    description: `${company.name} firma profili, ihale geçmişi ve sektörel analiz.`,
  };
}

export function generateStaticParams() {
  return companies.map((c) => ({ id: c.id }));
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const company = companies.find((c) => c.id === id);
  if (!company) notFound();

  return <CompanyProfileClient companyId={company.id} />;
}
