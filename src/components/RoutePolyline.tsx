/// <reference types="google.maps" />
import { useEffect, useState } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { decodePolyline } from '../lib/polyline';

export default function RoutePolyline({ encodedPolyline }: { encodedPolyline: string }) {
  const map = useMap();
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;
    const p = new google.maps.Polyline({
      strokeColor: '#3b82f6', // indigo/blue
      strokeOpacity: 0.8,
      strokeWeight: 5,
      map
    });
    setPolyline(p);

    return () => {
      p.setMap(null);
    };
  }, [map]);

  useEffect(() => {
    if (!polyline || !encodedPolyline) return;
    const path = decodePolyline(encodedPolyline);
    polyline.setPath(path);
  }, [polyline, encodedPolyline]);

  return null;
}
