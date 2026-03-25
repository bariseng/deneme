import MevzuatClient from "./MevzuatClient";

export const metadata = {
  title: "Mevzuat Değişiklik Radarı | İhalePro",
  description: "İhale mevzuatı değişikliklerini takip edin",
};

export default function MevzuatPage() {
  return <MevzuatClient />;
}
