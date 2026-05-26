export interface User {
  _id: string;
  clerkId: string;
  name: string;
  email: string;
  avatar?: string;
  elo: number;
  eloHistory: EloEntry[];
  matchesPlayed: number;
  wins: number;
  losses: number;
  location: { type: string; coordinates: [number, number] };
  city?: string;
  zipCode?: string;
  preferredSurface: 'hard' | 'clay' | 'grass' | 'any';
  preferredDistance: number;
  availability: string[];
  isAvailable: boolean;
  lastSeen: string;
  createdAt: string;
}

export interface EloEntry {
  elo: number;
  delta: number;
  matchId?: string;
  recordedAt: string;
}

export interface Match {
  _id: string;
  requester: User;
  opponent: User;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  scheduledAt?: string;
  court?: Court;
  score?: { sets: number[][]; requesterSets?: number; opponentSets?: number };
  winner?: string;
  eloSnapshot: { requester: number; opponent: number };
  eloChange?: { requester: number; opponent: number };
  messages: Message[];
  scoreSubmittedBy: string[];
  createdAt: string;
}

export interface Message {
  _id: string;
  sender: User | string;
  text: string;
  sentAt: string;
}

export interface Court {
  _id: string;
  name: string;
  address: string;
  location: { type: string; coordinates: [number, number] };
  surface: 'hard' | 'clay' | 'grass';
  litCourts: boolean;
  indoor: boolean;
  numCourts: number;
  distanceMeters?: number;
}

export interface NearbyPlayer extends Partial<User> {
  distanceMeters: number;
}

export interface AnalyticsOverview {
  users: { total: number; dau: number; wau: number; mau: number };
  matches: { total: number; pending: number; accepted: number; completed: number };
  funnel: { acceptanceRate: number; completionRate: number };
  eloDistribution: { _id: number | string; count: number }[];
}
