import type { BucketLocation } from './types';

// Haversine distance between two points in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; 
}

export function kMeansCluster(locations: BucketLocation[], k: number): BucketLocation[][] {
  if (locations.length <= k) {
    return locations.map(l => [l]);
  }

  // 1. Initialize centroids randomly from existing points
  let centroids = locations
    .sort(() => 0.5 - Math.random())
    .slice(0, k)
    .map(l => ({ lat: l.lat, lng: l.lng }));
  
  let clusters: BucketLocation[][] = Array.from({ length: k }, () => []);
  let hasChanged = true;
  let iterations = 0;

  while (hasChanged && iterations < 50) {
    hasChanged = false;
    const newClusters: BucketLocation[][] = Array.from({ length: k }, () => []);

    // 2. Assign points to nearest centroid
    for (const loc of locations) {
      let minDist = Infinity;
      let closestIdx = 0;
      centroids.forEach((c, idx) => {
        const dist = getDistance(loc.lat, loc.lng, c.lat, c.lng);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = idx;
        }
      });
      newClusters[closestIdx].push(loc);
    }

    // 3. Recalculate centroids
    for (let i = 0; i < k; i++) {
      if (newClusters[i].length === 0) continue;
      
      const sumLat = newClusters[i].reduce((sum, l) => sum + l.lat, 0);
      const sumLng = newClusters[i].reduce((sum, l) => sum + l.lng, 0);
      
      const newLat = sumLat / newClusters[i].length;
      const newLng = sumLng / newClusters[i].length;
      
      // If centroid moved significantly, we haven't converged
      if (Math.abs(centroids[i].lat - newLat) > 0.0001 || Math.abs(centroids[i].lng - newLng) > 0.0001) {
        hasChanged = true;
      }
      
      centroids[i] = { lat: newLat, lng: newLng };
    }

    clusters = newClusters;
    iterations++;
  }

  return clusters.filter(c => c.length > 0);
}
