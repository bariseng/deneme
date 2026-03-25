import IhalelerClient from "./IhalelerClient";

export const metadata = {
  title: "Uluslararası İhaleler | İhalePro",
  description: "Yurtdışı ihaleleri listeleyin ve filtreleyin",
};

export default function IhalelerPage() {
  return <IhalelerClient />;
}
