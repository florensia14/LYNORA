
"use client";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useEffect } from "react";

export type Position = {
  lat: number;
  lon: number;
};

export type MapVenue = {
  id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

type Props = {
  position: Position | null;
  venues?: MapVenue[];
  onPick: (position: Position) => void;
};

function MapClickHandler({
  onPick,
}: {
  onPick: Props["onPick"];
}) {
  useMapEvents({
    click(event) {
      onPick({
        lat: event.latlng.lat,
        lon: event.latlng.lng,
      });
    },
  });

  return null;
}

function Recenter({
  position,
}: {
  position: Position | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(
        [position.lat, position.lon],
        16,
        { duration: 0.8 }
      );
    }
  }, [map, position?.lat, position?.lon]);

  return null;
}

export default function VenueMap({
  position,
  venues = [],
  onPick,
}: Props) {
  const center: [number, number] = position
    ? [position.lat, position.lon]
    : [-6.2000, 106.8166];

  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-xl border border-[#34345B]">
      <MapContainer
        center={center}
        zoom={position ? 16 : 11}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onPick={onPick} />

        <Recenter position={position} />

        {/* Registered venues */}
        {venues.map((venue) => {
          if (
            venue.latitude == null ||
            venue.longitude == null
          ) {
            return null;
          }

          const selected =
            position &&
            Math.abs(position.lat - Number(venue.latitude)) < 0.00001 &&
            Math.abs(position.lon - Number(venue.longitude)) < 0.00001;

          return (
            <CircleMarker
              key={venue.id}
              center={[
                Number(venue.latitude),
                Number(venue.longitude),
              ]}
              radius={selected ? 9 : 6}
              pathOptions={{
                color: "#FFFFFF",
                weight: 2,
                fillColor: selected ? "#8B5CF6" : "#22D3EE",
                fillOpacity: 1,
              }}
              eventHandlers={{
                click: () =>
                  onPick({
                    lat: Number(venue.latitude),
                    lon: Number(venue.longitude),
                  }),
              }}
            />
          );
        })}

        {/* Selected location */}
        {position && (
          <CircleMarker
            center={[position.lat, position.lon]}
            radius={10}
            pathOptions={{
              color: "#FFFFFF",
              weight: 3,
              fillColor: "#8B5CF6",
              fillOpacity: 1,
            }}
          />
        )}
      </MapContainer>

      <div className="absolute bottom-2 left-2 z-[400] rounded-md border border-white/10 bg-[#0B1122]/90 px-2 py-1 text-[10px] text-slate-300">
        <span className="mr-1 text-cyan-400">●</span>
        Registered venues
        <span className="mx-2 text-purple-400">●</span>
        Selected location
      </div>
    </div>
  );
}
