import { Metadata } from "next";
import CommunityClient from "./CommunityClient";

export const metadata: Metadata = {
  title: "Topluluk & Bilgi Paylaşım Platformu",
  description: "İhale forumu, bilgi bankası, firma değerlendirmeleri ve etkinlik takvimi",
};

export default function CommunityPage() {
  return <CommunityClient />;
}
