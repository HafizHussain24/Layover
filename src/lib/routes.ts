export interface RouteWaypoint {
  placeId?: string;
  lat?: number;
  lng?: number;
}

export interface ComputeRoutesRequest {
  origin: RouteWaypoint;
  destination: RouteWaypoint;
  intermediates?: RouteWaypoint[];
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

function toGoogleWaypoint(w: RouteWaypoint) {
  // If valid coordinates exist, location.latLng is universally supported and avoids NOT_FOUND Place ID errors
  if (typeof w.lat === 'number' && typeof w.lng === 'number' && !isNaN(w.lat) && !isNaN(w.lng)) {
    return {
      location: {
        latLng: {
          latitude: w.lat,
          longitude: w.lng,
        },
      },
    };
  }
  return { placeId: w.placeId || '' };
}

export async function computeRoutes(request: ComputeRoutesRequest): Promise<ComputeRoutesResponse> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Maps API key is missing');

  const origin = toGoogleWaypoint(request.origin);
  const destination = toGoogleWaypoint(request.destination);
  const intermediates = request.intermediates?.map(toGoogleWaypoint) ?? [];

  // Convert to proper REST body for Routes API
  const body: any = {
    origin,
    destination,
    intermediates,
    travelMode: request.travelMode,
    optimizeWaypointOrder: request.optimizeWaypointOrder ?? false,
  };

  if (request.travelMode === 'DRIVE') {
    body.routingPreference = 'TRAFFIC_AWARE';
  }

  const fieldMask = [
    'routes.duration',
    'routes.distanceMeters',
    'routes.polyline.encodedPolyline',
    'routes.optimizedIntermediateWaypointIndex',
  ].join(',');

  const doFetch = async (payload: any) => {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(payload),
    });
    return res;
  };

  let response = await doFetch(body);

  // If WALK fails with no routes or invalid argument (e.g. stops are too far apart for pedestrians), fallback to DRIVE
  if (!response.ok && request.travelMode === 'WALK') {
    console.warn('Walking route calculation failed or unavailable for this distance. Falling back to DRIVE mode.');
    const fallbackBody = {
      ...body,
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    };
    response = await doFetch(fallbackBody);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Routes API Error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  if (!data.routes || data.routes.length === 0) {
    // If WALK returned 200 OK but empty routes (no walking path between points), fallback to DRIVE
    if (request.travelMode === 'WALK') {
      const fallbackBody = {
        ...body,
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      };
      const fbRes = await doFetch(fallbackBody);
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        if (fbData.routes && fbData.routes.length > 0) {
          return fbData;
        }
      }
    }
    throw new Error('No routes found between selected stops');
  }

  return data;
}
