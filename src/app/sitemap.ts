import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://ihalepro.com";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/ihaleler`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${baseUrl}/hakkimizda`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/iletisim`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/giris`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/kayit`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const dbTenders = await prisma.tender.findMany({
    select: { id: true, publishDate: true },
    orderBy: { publishDate: "desc" },
    take: 5000,
  });

  const tenderRoutes: MetadataRoute.Sitemap = dbTenders.map((t) => ({
    url: `${baseUrl}/ihaleler/${t.id}`,
    lastModified: t.publishDate,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticRoutes, ...tenderRoutes];
}
