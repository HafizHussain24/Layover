/// <reference types="google.maps" />
import { Map, useMap } from '@vis.gl/react-google-maps';
import { useEffect } from 'react';
import type { BucketLocation } from '../lib/types';
import PlaceMarker from './PlaceMarker';

export default function MapComponent({ 
  items, 
  sequenceMap, 
  destination,
  children 
}: { 
  items: BucketLocation[]; 
  sequenceMap?: Record<string, number>; 
  destination?: { lat: number; lng: number } | null;
  children?: React.ReactNode; 
}) {
  const map = useMap();
  const mapId = import.meta.env.VITE_GOOGLE_MAP_ID;

  useEffect(() => {
    if (!map) return;
    if (items.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      items.forEach((item) => bounds.extend({ lat: item.lat, lng: item.lng }));
      map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
    } else if (destination?.lat && destination?.lng) {
      map.panTo({ lat: destination.lat, lng: destination.lng });
      map.setZoom(12);
    }
  }, [map, items, destination?.lat, destination?.lng]);

  const defaultCenter = destination?.lat && destination?.lng
    ? { lat: destination.lat, lng: destination.lng }
    : { lat: 20.5937, lng: 78.9629 };
  const defaultZoom = destination?.lat ? 12 : 5;

  return (
    <Map
      defaultCenter={defaultCenter}
      defaultZoom={defaultZoom}
      mapId={mapId}
      disableDefaultUI={true}
      className="w-full h-full"
    >
      {items.map((item) => {
        const seq = sequenceMap ? (sequenceMap[item.id] ?? sequenceMap[item.place_id]) : undefined;
        return <PlaceMarker key={item.id} item={item} sequenceNumber={seq} />;
      })}
      {children}
    </Map>
  );
}
