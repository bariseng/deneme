"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  FileText,
  Bell,
  User,
} from "lucide-react";
import { useUserStore } from "@/lib/store";

const navItems = [
  { href: "/", icon: Home, label: "Ana Sayfa" },
  { href: "/ihaleler", icon: Search, label: "İhaleler" },
  { href: "/teklifler", icon: FileText, label: "Teklifler" },
  { href: "/bildirimler", icon: Bell, label: "Bildirimler" },
  { href: "/dashboard", icon: User, label: "Panelim" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const unreadCount = useUserStore((s) => s.notifications.filter((n) => !n.read).length);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border lg:hidden safe-area-bottom"
      aria-label="Mobil navigasyon"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const isBell = item.label === "Bildirimler";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1 rounded-lg transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-foreground-light hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {isBell && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-secondary text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] leading-tight ${
                  isActive ? "font-semibold" : "font-medium"
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
