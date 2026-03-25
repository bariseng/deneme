import type { Metadata } from "next";
import OfflineClient from "./OfflineClient";

export const metadata: Metadata = {
  title: "Çevrimdışı",
};

export default function OfflinePage() {
  return <OfflineClient />;
}
