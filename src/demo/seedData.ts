/**
 * DEMO DATA — isMock: true
 * Used when ?demo=1 is in the URL. Zero backend calls.
 * All data is fake / pre-seeded for the pitch demo.
 * Badge: "demo data" shown in UI when this is active.
 */

import type { BucketLocation, ProposedRoute, Room } from '../lib/types';

export const isMock = true;

export const DEMO_ROOM: Room = {
  id: 'demo-room-kochi',
  name: 'Kochi Weekend',
  created_by: 'demo-user-1',
  created_at: new Date().toISOString(),
};

export const DEMO_BUCKET: BucketLocation[] = [
  {
    id: 'bl-1', room_id: 'demo-room-kochi', added_by: 'demo-user-1',
    place_id: 'ChIJnfzGrZAoCDsRoKUqFNX-yjQ',
    name: 'Fort Kochi Beach', address: 'Fort Kochi, Kochi, Kerala',
    category: 'Nature', lat: 9.9656, lng: 76.2432,
    rating: 4.4, review_count: 1820, is_mock_rating: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'bl-2', room_id: 'demo-room-kochi', added_by: 'demo-user-2',
    place_id: 'ChIJVTW7fZAoCDsRbZrjDrBhN1o',
    name: 'Mattancherry Palace', address: 'Palace Rd, Mattancherry, Kochi',
    category: 'Attraction', lat: 9.9567, lng: 76.2590,
    rating: 4.3, review_count: 4210, is_mock_rating: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'bl-3', room_id: 'demo-room-kochi', added_by: 'demo-user-1',
    place_id: 'ChIJR2xk_JEoCDsRgXoKnHzKJ0E',
    name: 'Jew Town Spice Market', address: 'Jew Town Rd, Mattancherry',
    category: 'Shopping', lat: 9.9556, lng: 76.2607,
    rating: 4.6, review_count: 312, is_mock_rating: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'bl-4', room_id: 'demo-room-kochi', added_by: 'demo-user-2',
    place_id: 'ChIJAbCdEfGhIjKlMnOpQrStUvW',
    name: 'Kashi Art Cafe', address: 'Burgher Street, Fort Kochi',
    category: 'Cafe', lat: 9.9645, lng: 76.2430,
    rating: 4.7, review_count: 198, is_mock_rating: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'bl-5', room_id: 'demo-room-kochi', added_by: 'demo-user-1',
    place_id: 'ChIJXxYyZzAaBbCcDdEeFfGgHhI',
    name: 'Chinese Fishing Nets', address: 'River Rd, Fort Kochi',
    category: 'Attraction', lat: 9.9678, lng: 76.2401,
    rating: 4.5, review_count: 6543, is_mock_rating: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'bl-6', room_id: 'demo-room-kochi', added_by: 'demo-user-2',
    place_id: 'ChIJiiJjKkLlMmNnOoPpQqRrSsT',
    name: 'Santa Cruz Cathedral Basilica', address: 'KB Jacob Rd, Fort Kochi',
    category: 'Attraction', lat: 9.9639, lng: 76.2449,
    rating: 4.6, review_count: 2871, is_mock_rating: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'bl-7', room_id: 'demo-room-kochi', added_by: 'demo-user-1',
    place_id: 'ChIJuuVvWwXxYyZz0011223344',
    name: "Loafer's Corner", address: 'Beach Rd, Fort Kochi',
    category: 'Food', lat: 9.9682, lng: 76.2420,
    rating: 4.5, review_count: 423, is_mock_rating: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'bl-8', room_id: 'demo-room-kochi', added_by: 'demo-user-2',
    place_id: 'ChIJ5566778899aabbccddeeff',
    name: 'Kerala Folklore Museum', address: 'Thevara, Kochi',
    category: 'Attraction', lat: 9.9443, lng: 76.2870,
    rating: 4.6, review_count: 189, is_mock_rating: false,
    created_at: new Date().toISOString(),
  },
];

export const DEMO_ROUTES: ProposedRoute[] = [
  {
    id: 'route-1',
    room_id: 'demo-room-kochi',
    created_by: 'demo-user-1',
    route_name: 'Fort Kochi Heritage Walk',
    travel_mode: 'WALK',
    waypoint_order: ['bl-5', 'bl-6', 'bl-4', 'bl-1'],
    total_duration_mins: 45,
    total_distance_m: 2800,
    encoded_polyline: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'route-2',
    room_id: 'demo-room-kochi',
    created_by: 'demo-user-2',
    route_name: 'Full Day Kochi Tour',
    travel_mode: 'DRIVE',
    waypoint_order: ['bl-1', 'bl-5', 'bl-3', 'bl-2', 'bl-8'],
    total_duration_mins: 130,
    total_distance_m: 14200,
    encoded_polyline: null,
    created_at: new Date().toISOString(),
  },
];

export const DEMO_VOTES: Record<string, number> = {
  'route-1': 1,
  'route-2': 2,
};

export const DEMO_USERS = [
  { userId: 'demo-user-1', displayName: 'Aditya', avatarColor: '#6366f1' },
  { userId: 'demo-user-2', displayName: 'Riya', avatarColor: '#ec4899' },
];
