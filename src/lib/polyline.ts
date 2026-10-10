/**
 * Decodes an encoded polyline string into an array of {lat, lng} coordinates.
 * Using a pure JS implementation avoids the need to wait for the Maps geometry library to load.
 */
export function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  if (!encoded) return [];
  
  const poly: { lat: number; lng: number }[] = [];
  let index = 0,
      len = encoded.length,
      lat = 0,
      lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charAt(index++).charCodeAt(0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charAt(index++).charCodeAt(0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return poly;
}
