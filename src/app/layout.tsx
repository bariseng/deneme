import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = localFont({
  src: [
    {
      path: "../fonts/inter-var.woff2",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "ihalepro | ÜCRETSİZ İhale Takibi ve İhaleler için Rakip Analizi",
    template: "%s | İhalePro",
  },
  description:
    "İhaleye açılan her kapı burada! Ücretsiz ihale takibi, yapay zeka ile ihale arama, rakip analizi ve kapsamlı ihale databankası.",
  keywords: [
    "ihale",
    "kamu ihale",
    "ihale takip",
    "ihale ilanları",
    "devlet ihalesi",
    "yapım ihalesi",
    "hizmet ihalesi",
    "mal alımı",
  ],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "İhalePro",
    title: "İhalePro - Türkiye'nin İhale Platformu",
    description:
      "Türkiye genelindeki kamu ve özel sektör ihalelerini takip edin.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "İhalePro",
              url: "https://ihalepro.com",
              description:
                "Türkiye'nin en kapsamlı ihale takip platformu",
              sameAs: [
                "https://twitter.com/ihalepro",
                "https://linkedin.com/company/ihalepro",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "İhalePro",
              url: "https://ihalepro.com",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://ihalepro.com/ihaleler?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
