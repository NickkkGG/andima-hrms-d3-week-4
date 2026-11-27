"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Map, MapPin, Satellite } from "lucide-react";
import { useLanguage, type SupportedLanguage } from "@/components/i18n/LanguageProvider";
import { segmentedClass } from "@/components/ui/styles";

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

// Zoom 16 frames about the same area as the OpenStreetMap bounding box below,
// so switching between map and satellite keeps the same view.
const SATELLITE_ZOOM = 16;

const copyByLanguage = {
  id: {
    title: "Lokasi presensi",
    standard: "Peta",
    satellite: "Satelit",
    clockIn: "Lokasi clock-in",
    clockOut: "Lokasi clock-out",
    accuracy: "akurasi",
    noLocation: "Lokasi belum tersimpan untuk presensi ini.",
    onMap: "pada peta",
    onSatellite: "dalam tampilan satelit",
  },
  en: {
    title: "Attendance location",
    standard: "Map",
    satellite: "Satellite",
    clockIn: "Clock-in location",
    clockOut: "Clock-out location",
    accuracy: "accuracy",
    noLocation: "No location was saved for this attendance.",
    onMap: "on the map",
    onSatellite: "in satellite view",
  },
} as const;

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

function standardMapUrl(location: AttendanceLocation) {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(mapBounds(location))}&layer=mapnik&marker=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`;
}

// Keyless Google Maps embed in satellite mode (5e1), pinned on the coordinates and
// interactive like the OpenStreetMap view. maps.google.com redirects
// `?q=lat,lng&t=k&output=embed` to this URL; using it directly skips that redirect,
// which is served with X-Frame-Options: SAMEORIGIN.
function satelliteMapUrl(location: AttendanceLocation, language: SupportedLanguage) {
  const query = `${location.latitude!.toFixed(6)},${location.longitude!.toFixed(6)}`;
  return `https://www.google.com/maps/embed?origin=mfe&pb=!1m4!2m1!1s${query}!5e1!6i${SATELLITE_ZOOM}!3m1!1s${language}!5m1!1s${language}`;
}

function googleMapsUrl(location: AttendanceLocation) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`;
}

function appleMapsUrl(location: AttendanceLocation) {
  return `https://maps.apple.com/?ll=${encodeURIComponent(`${location.latitude},${location.longitude}`)}&q=Lokasi%20presensi`;
}

export default function LocationMapPreview({ clockIn, clockOut, className = "" }: Props) {
  const { language } = useLanguage();
  const copy = copyByLanguage[language];
  const availableSlots = useMemo(() => {
    const slots: Array<{ id: LocationSlot; label: string; location: AttendanceLocation }> = [];
    if (hasCoordinates(clockIn)) slots.push({ id: "clockIn", label: copy.clockIn, location: clockIn });
    if (hasCoordinates(clockOut)) slots.push({ id: "clockOut", label: copy.clockOut, location: clockOut! });
    return slots;
  }, [clockIn, clockOut, copy]);
  const [selectedSlot, setSelectedSlot] = useState<LocationSlot>("clockIn");
  const [mapMode, setMapMode] = useState<MapMode>("standard");

  const selected = availableSlots.find((slot) => slot.id === selectedSlot) ?? availableSlots[0];
  if (!selected) {
    return (
      <div className={`rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500 ${className}`}>
        {copy.noLocation}
      </div>
    );
  }

  const { location } = selected;

  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900"><MapPin size={15} className="text-blue-600" />{copy.title}</div>
        <div className={segmentedClass.group}>
          <button type="button" onClick={() => setMapMode("standard")} className={`${segmentedClass.item} ${mapMode === "standard" ? segmentedClass.active : segmentedClass.idle}`}><Map size={12} />{copy.standard}</button>
          <button type="button" onClick={() => setMapMode("satellite")} className={`${segmentedClass.item} ${mapMode === "satellite" ? segmentedClass.active : segmentedClass.idle}`}><Satellite size={12} />{copy.satellite}</button>
        </div>
      </div>

      {availableSlots.length > 1 && (
        <div className="flex border-b border-slate-200 px-3 py-2">
          <div className={segmentedClass.group}>
            {availableSlots.map((slot) => <button key={slot.id} type="button" onClick={() => setSelectedSlot(slot.id)} className={`${segmentedClass.item} ${selected.id === slot.id ? segmentedClass.active : segmentedClass.idle}`}>{slot.label}</button>)}
          </div>
        </div>
      )}

      <div className="relative aspect-[16/8] bg-slate-100">
        {/* Visible behind the map frame until the map has painted. */}
        <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-slate-200 motion-reduce:animate-none" />
        {mapMode === "standard" ? (
          <iframe title={`${selected.label} ${copy.onMap}`} src={standardMapUrl(location)} className="absolute inset-0 size-full border-0" loading="lazy" />
        ) : (
          <iframe title={`${selected.label} ${copy.onSatellite}`} src={satelliteMapUrl(location, language)} className="absolute inset-0 size-full border-0" loading="lazy" allowFullScreen />
        )}
      </div>

      <div className="space-y-2 px-3 py-2.5 text-[11px] text-slate-500">
        <p><span className="font-bold text-slate-900">{selected.label}:</span> {coordinateText(location)}{location.accuracyMeters != null ? ` · ${copy.accuracy} ±${Math.round(location.accuracyMeters)} m` : ""}</p>
        <div className="flex flex-wrap gap-3 font-semibold">
          <a href={googleMapsUrl(location)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline"><ExternalLink size={12} />Google Maps</a>
          <a href={appleMapsUrl(location)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline"><ExternalLink size={12} />Apple Maps</a>
        </div>
      </div>
    </section>
  );
}
