import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-200px)] bg-background-alt flex items-center justify-center py-12 px-4">
      <div className="text-center max-w-md">
        <p className="text-7xl font-extrabold text-primary mb-4">404</p>
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Sayfa Bulunamadı
        </h1>
        <p className="text-foreground-light mb-8">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-colors"
          >
            <Home size={16} />
            Ana Sayfa
          </Link>
          <Link
            href="/ihaleler"
            className="inline-flex items-center justify-center gap-2 h-11 px-6 border border-border hover:border-primary text-foreground hover:text-primary font-medium rounded-xl transition-colors"
          >
            <Search size={16} />
            İhale Ara
          </Link>
        </div>
      </div>
    </div>
  );
}
