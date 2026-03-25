import { Metadata } from "next";
import SertifikalarimClient from "./SertifikalarimClient";

export const metadata: Metadata = {
  title: "Sertifikalarım | İhale Akademisi",
  description: "Kazandığınız İhale Akademisi sertifikaları",
};

export default function SertifikalarimPage() {
  return <SertifikalarimClient />;
}
