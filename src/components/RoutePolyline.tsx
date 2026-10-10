/// <reference types="google.maps" />
import { useEffect, useState } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { decodePolyline } from '../lib/polyline';

interface RoutePolylineProps {
  encodedPolyline?: string | null;
  pathCoordinates?: google.maps.LatLngLiteral[] | null;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  arrowFillColor?: string;
  arrowStrokeColor?: string;
  zIndex?: number;
}

export default function RoutePolyline({ 
  encodedPolyline, 
  pathCoordinates,
  strokeColor = '#3b82f6',
  strokeOpacity = 0.9,
  strokeWeight = 5,
  arrowFillColor = '#93c5fd',
  arrowStrokeColor = '#1e3a8a',
  zIndex = 1,
}: RoutePolylineProps) {
  const map = useMap();
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    // Arrow symbol pointing in direction of travel
    const arrowSymbol: google.maps.Symbol = {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      strokeColor: arrowStrokeColor,
      strokeWeight: 1,
      fillColor: arrowFillColor,
      fillOpacity: 1,
      scale: 3,
    };

    const p = new google.maps.Polyline({
      strokeColor,
      strokeOpacity,
      strokeWeight,
      zIndex,
      icons: [
        {
          icon: arrowSymbol,
          offset: '25px',
          repeat: '70px',
        },
      ],
      map
    });
    setPolyline(p);

    return () => {
      p.setMap(null);
    };
  }, [map]);

  // Synchronize options when styling props change
  useEffect(() => {
    if (!polyline) return;
    const arrowSymbol: google.maps.Symbol = {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      strokeColor: arrowStrokeColor,
      strokeWeight: 1,
      fillColor: arrowFillColor,
      fillOpacity: 1,
      scale: 3,
    };

    polyline.setOptions({
      strokeColor,
      strokeOpacity,
      strokeWeight,
      zIndex,
      icons: [
        {
          icon: arrowSymbol,
          offset: '25px',
          repeat: '70px',
        },
      ],
    });
  }, [polyline, strokeColor, strokeOpacity, strokeWeight, arrowFillColor, arrowStrokeColor, zIndex]);

  // Synchronize path coordinates
  useEffect(() => {
    if (!polyline) return;
    if (encodedPolyline && encodedPolyline.trim().length > 0) {
      const path = decodePolyline(encodedPolyline);
      polyline.setPath(path);
    } else if (pathCoordinates && pathCoordinates.length > 0) {
      polyline.setPath(pathCoordinates);
    } else {
      polyline.setPath([]);
    }
  }, [polyline, encodedPolyline, pathCoordinates]);

  return null;
}

