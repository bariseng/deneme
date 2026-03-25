import type { Metadata } from "next";
import { Suspense } from "react";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Firma Karşılaştırma",
  description: "İhale firmalarını yan yana karşılaştırın.",
};

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background-alt min-h-screen flex items-center justify-center">
          <p className="text-foreground-light">Yükleniyor...</p>
        </div>
      }
    >
      <CompareClient />
    </Suspense>
  );
}
