export interface Waypoint {
  placeId: string;
}

export interface ComputeRoutesRequest {
  origin: { placeId: string };
  destination: { placeId: string };
  intermediates?: { placeId: string }[];
  travelMode: 'DRIVE' | 'WALK';
  optimizeWaypointOrder?: boolean;
}

export interface ComputeRoutesResponse {
  routes: Array<{
    distanceMeters: number;
    duration: string; // e.g. "1200s"
    polyline: {
      encodedPolyline: string;
    };
    optimizedIntermediateWaypointIndex?: number[];
  }>;
}

export async function computeRoutes(request: ComputeRoutesRequest): Promise<ComputeRoutesResponse> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Maps API key is missing');

  // Convert to proper REST body for Routes API
  const body = {
    origin: { placeId: request.origin.placeId },
    destination: { placeId: request.destination.placeId },
    intermediates: request.intermediates?.map(i => ({ placeId: i.placeId })) ?? [],
    travelMode: request.travelMode,
    routingPreference: request.travelMode === 'DRIVE' ? 'TRAFFIC_AWARE' : 'UNSPECIFIED',
    optimizeWaypointOrder: request.optimizeWaypointOrder ?? false,
  };

  const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.optimizedIntermediateWaypointIndex',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Routes API Error: ${response.status} - ${text}`);
  }

  return response.json();
}
