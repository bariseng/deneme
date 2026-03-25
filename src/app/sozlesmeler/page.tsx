import { Metadata } from "next";
import ContractsClient from "./ContractsClient";

export const metadata: Metadata = {
  title: "Sözleşme & Performans Yönetimi",
  description: "Sözleşme yönetimi, hakediş takibi, iş ilerleme raporu, tedarikçi performans kartı, teminat takibi",
};

export default function ContractsPage() {
  return <ContractsClient />;
}
