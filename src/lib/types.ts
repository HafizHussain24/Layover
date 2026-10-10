/** Shared TypeScript types for WayMark */

export interface Profile {
  id: string;
  display_name: string;
  avatar_color: string;
  avatar_url?: string | null;
  email?: string | null;
}

export interface Room {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  destination_name?: string | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
}

export interface BucketLocation {
  id: string;
  room_id: string;
  added_by: string | null;
  place_id: string;
  name: string;
  address: string | null;
  category: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  review_count: number | null;
  is_mock_rating: boolean;
  created_at: string;
}

export interface ProposedRoute {
  id: string;
  room_id: string;
  created_by: string | null;
  route_name: string | null;
  travel_mode: 'DRIVE' | 'WALK';
  waypoint_order: string[]; // array of bucket_location ids in order
  total_duration_mins: number | null;
  total_distance_m: number | null;
  encoded_polyline: string | null;
  created_at: string;
}

export interface RouteVote {
  route_id: string;
  user_id: string;
}

export interface PresenceUser {
  userId: string;
  displayName: string;
  avatarColor: string;
  status?: string; // e.g. "is adding a place..."
  onlineAt: string;
}
