/**
 * Google Maps Routes API helper.
 * Uses the Routes API (NEW), NOT the legacy Directions API.
 * Docs: https://developers.google.com/maps/documentation/routes
 */

export interface RouteWaypoint {
  lat: number;
  lng: number;
  name: string;
}

export interface RouteResult {
  durationSeconds: number;
  distanceMeters: number;
  encodedPolyline: string;
  optimizedOrder?: number[]; // only present when optimizeWaypointOrder was true
}

const ROUTES_API_URL =
  'https://routes.googleapis.com/directions/v2:computeRoutes';

const FIELD_MASK = [
  'routes.duration',
  'routes.distanceMeters',
  'routes.polyline.encodedPolyline',
  'routes.optimizedIntermediateWaypointIndex',
].join(',');

function makeLatLngWaypoint(lat: number, lng: number) {
  return {
    location: {
      latLng: { latitude: lat, longitude: lng },
    },
  };
}

export async function computeRoute(
  waypoints: RouteWaypoint[],
  travelMode: 'DRIVE' | 'WALK',
  optimizeOrder = false
): Promise<RouteResult> {
  if (waypoints.length < 2) {
    throw new Error('At least 2 waypoints required');
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
  if (!apiKey) throw new Error('Missing VITE_GOOGLE_MAPS_API_KEY');

  const origin = makeLatLngWaypoint(waypoints[0].lat, waypoints[0].lng);
  const destination = makeLatLngWaypoint(
    waypoints[waypoints.length - 1].lat,
    waypoints[waypoints.length - 1].lng
  );
  const intermediates = waypoints
    .slice(1, -1)
    .map((w) => makeLatLngWaypoint(w.lat, w.lng));

  const body: Record<string, unknown> = {
    origin,
    destination,
    intermediates,
    travelMode,
    optimizeWaypointOrder: optimizeOrder,
  };

  const res = await fetch(ROUTES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Routes API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const route = data?.routes?.[0];
  if (!route) throw new Error('No route returned from Routes API');

  return {
    durationSeconds: Number(route.duration?.replace('s', '') ?? 0),
    distanceMeters: route.distanceMeters ?? 0,
    encodedPolyline: route.polyline?.encodedPolyline ?? '',
    optimizedOrder: route.optimizedIntermediateWaypointIndex,
  };
}
