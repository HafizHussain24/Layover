/// <reference types="google.maps" />
import { Map, useMap } from '@vis.gl/react-google-maps';
import { useEffect } from 'react';
import type { BucketLocation } from '../lib/types';
import PlaceMarker from './PlaceMarker';

export default function MapComponent({ 
  items, 
  sequenceMap, 
  children 
}: { 
  items: BucketLocation[]; 
  sequenceMap?: Record<string, number>; 
  children?: React.ReactNode; 
}) {
  const map = useMap();
  const mapId = import.meta.env.VITE_GOOGLE_MAP_ID;

  useEffect(() => {
    if (!map || items.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    items.forEach((item) => bounds.extend({ lat: item.lat, lng: item.lng }));
    map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
  }, [map, items]);

  return (
    <Map
      defaultCenter={{ lat: 20.5937, lng: 78.9629 }} // Default to India
      defaultZoom={5}
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
