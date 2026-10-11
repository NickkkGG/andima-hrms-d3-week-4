"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Map, MapPin, Satellite } from "lucide-react";

export type AttendanceLocation = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  accuracyMeters?: number | null | undefined;
};

type LocationSlot = "clockIn" | "clockOut";
type MapMode = "standard" | "satellite";

type Props = {
  clockIn: AttendanceLocation;
  clockOut?: AttendanceLocation | null;
  className?: string;
};

function hasCoordinates(location: AttendanceLocation | null | undefined) {
  return Boolean(
    location
      && typeof location.latitude === "number"
      && Number.isFinite(location.latitude)
      && typeof location.longitude === "number"
      && Number.isFinite(location.longitude),
  );
}

function coordinateText(location: AttendanceLocation) {
  return `${location.latitude!.toFixed(6)}, ${location.longitude!.toFixed(6)}`;
}

function mapBounds(location: AttendanceLocation) {
  const latitude = location.latitude!;
  const longitude = location.longitude!;
  const latitudeDelta = 0.0045;
  const longitudeDelta = 0.006;
  return [
    longitude - longitudeDelta,
    latitude - latitudeDelta,
    longitude + longitudeDelta,
    latitude + latitudeDelta,
  ].join(",");
}

function googleMapsUrl(location: AttendanceLocation) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`;
}

function appleMapsUrl(location: AttendanceLocation) {
  return `https://maps.apple.com/?ll=${encodeURIComponent(`${location.latitude},${location.longitude}`)}&q=Lokasi%20presensi`;
}

export default function LocationMapPreview({ clockIn, clockOut, className = "" }: Props) {
  const availableSlots = useMemo(() => {
    const slots: Array<{ id: LocationSlot; label: string; location: AttendanceLocation }> = [];
    if (hasCoordinates(clockIn)) slots.push({ id: "clockIn", label: "Lokasi clock-in", location: clockIn });
    if (hasCoordinates(clockOut)) slots.push({ id: "clockOut", label: "Lokasi clock-out", location: clockOut! });
    return slots;
  }, [clockIn, clockOut]);
  const [selectedSlot, setSelectedSlot] = useState<LocationSlot>("clockIn");
  const [mapMode, setMapMode] = useState<MapMode>("standard");

  const selected = availableSlots.find((slot) => slot.id === selectedSlot) ?? availableSlots[0];
  if (!selected) {
    return (
      <div className={`rounded-xl border border-dashed border-[#becabd] bg-[#f7f8ff] p-3 text-xs text-[#4d5f81] ${className}`}>
        Lokasi belum tersimpan untuk presensi ini.
      </div>
    );
  }

  const { location } = selected;
  const standardMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(mapBounds(location))}&layer=mapnik&marker=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`;
  const satelliteMapUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${encodeURIComponent(mapBounds(location))}&bboxSR=4326&imageSR=4326&size=900,460&format=png32&transparent=false&f=image`;

  return (
    <section className={`overflow-hidden rounded-xl border border-[#d9e2fc] bg-white ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d9e2fc] px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-[#121b2e]"><MapPin size={15} className="text-[#006838]" />Lokasi presensi</div>
        <div className="flex rounded-lg bg-[#f1f3ff] p-0.5 text-[10px] font-bold">
          <button type="button" onClick={() => setMapMode("standard")} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${mapMode === "standard" ? "bg-white text-[#006838] shadow-sm" : "text-[#4d5f81]"}`}><Map size={12} />Peta</button>
          <button type="button" onClick={() => setMapMode("satellite")} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${mapMode === "satellite" ? "bg-white text-[#006838] shadow-sm" : "text-[#4d5f81]"}`}><Satellite size={12} />Satelit</button>
        </div>
      </div>

      {availableSlots.length > 1 && (
        <div className="flex gap-1 border-b border-[#d9e2fc] px-3 py-2 text-[10px] font-bold">
          {availableSlots.map((slot) => <button key={slot.id} type="button" onClick={() => setSelectedSlot(slot.id)} className={`rounded-md px-2 py-1 ${selected.id === slot.id ? "bg-[#eaf7f0] text-[#006838]" : "text-[#4d5f81] hover:bg-[#f1f3ff]"}`}>{slot.label}</button>)}
        </div>
      )}

      <div className="relative aspect-[16/8] bg-[#eaf0f8]">
        {mapMode === "standard" ? (
          <iframe title={`${selected.label} pada peta`} src={standardMapUrl} className="absolute inset-0 size-full border-0" loading="lazy" />
        ) : (
          // Native image is intentional: the public satellite export endpoint does not need an API key.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={satelliteMapUrl} alt={`${selected.label} dalam tampilan satelit`} className="absolute inset-0 size-full object-cover" loading="lazy" />
        )}
        {mapMode === "satellite" && <span className="absolute bottom-1 right-1 rounded bg-black/55 px-1.5 py-0.5 text-[9px] text-white">© Esri</span>}
      </div>

      <div className="space-y-2 px-3 py-2.5 text-[10px] text-[#4d5f81]">
        <p><span className="font-bold text-[#121b2e]">{selected.label}:</span> {coordinateText(location)}{location.accuracyMeters != null ? ` · akurasi ±${Math.round(location.accuracyMeters)} m` : ""}</p>
        <div className="flex flex-wrap gap-2 font-bold">
          <a href={googleMapsUrl(location)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1971c2] hover:underline"><ExternalLink size={12} />Google Maps</a>
          <a href={appleMapsUrl(location)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1971c2] hover:underline"><ExternalLink size={12} />Apple Maps</a>
        </div>
      </div>
    </section>
  );
}
