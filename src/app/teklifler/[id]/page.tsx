import type { Metadata } from "next";
import BidEditorClient from "./BidEditorClient";

export const metadata: Metadata = {
  title: "Teklif Düzenle",
  description: "Teklif düzenleme ve maliyet hesaplama aracı.",
};

export default async function BidDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BidEditorClient bidId={id} />;
}
