/// <reference types="google.maps" />
import { Map, useMap } from '@vis.gl/react-google-maps';
import { useEffect } from 'react';
import type { BucketLocation } from '../lib/types';
import PlaceMarker from './PlaceMarker';

export default function MapComponent({ items, children }: { items: BucketLocation[], children?: React.ReactNode }) {
  const map = useMap();
  const mapId = import.meta.env.VITE_GOOGLE_MAP_ID;

  useEffect(() => {
    if (!map || items.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    items.forEach((item) => bounds.extend({ lat: item.lat, lng: item.lng }));
    map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
  }, [map, items]);

  return (
    <Map
      defaultCenter={{ lat: 20.5937, lng: 78.9629 }} // Default to India
      defaultZoom={5}
      mapId={mapId}
      disableDefaultUI={true}
      className="w-full h-full"
    >
      {items.map((item) => (
        <PlaceMarker key={item.id} item={item} />
      ))}
      {children}
    </Map>
  );
}
