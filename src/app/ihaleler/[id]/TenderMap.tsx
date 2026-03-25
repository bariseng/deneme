import { MapPin } from "lucide-react";

interface Props {
  city: string;
  coordinates?: { lat: number; lng: number };
}

export default function TenderMap({ city, coordinates }: Props) {
  if (!coordinates) return null;

  return (
    <section className="bg-white rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <MapPin size={20} className="text-primary" />
        İhale Lokasyonu
      </h2>
      <div className="rounded-lg overflow-hidden border border-border bg-background-alt">
        {/* OpenStreetMap static embed — no API key needed */}
        <iframe
          title={`${city} harita`}
          width="100%"
          height="280"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${coordinates.lng - 0.08}%2C${coordinates.lat - 0.05}%2C${coordinates.lng + 0.08}%2C${coordinates.lat + 0.05}&layer=mapnik&marker=${coordinates.lat}%2C${coordinates.lng}`}
        />
        <div className="px-4 py-2 text-xs text-foreground-light flex items-center gap-1">
          <MapPin size={12} />
          {city}, Türkiye
        </div>
      </div>
    </section>
  );
}
