import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AIChatbot from "@/components/AIChatbot";
import PWAProvider from "@/components/PWAProvider";
import BottomNav from "@/components/BottomNav";
import Providers from "@/components/Providers";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "İhalePro",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
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
        <meta name="theme-color" content="#1a56db" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
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
        <Providers>
          <Header />
          <main className="flex-1 pb-16 lg:pb-0">{children}</main>
          <Footer />
          <BottomNav />
          <AIChatbot />
          <PWAProvider />
        </Providers>
      </body>
    </html>
  );
}
