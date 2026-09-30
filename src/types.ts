export type PlayerRole = 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
export type PlayerCategory = 'MARQUEE' | 'SET_A' | 'SET_B' | 'ACCELERATED';
export type PlayerStatus = 'AVAILABLE' | 'IN_AUCTION' | 'SOLD' | 'UNSOLD';
export type CurrencyType = 'INR' | 'POINTS' | 'LAKHS' | 'USD';

export interface PlayerStats {
  matches: number;
  runs: number;
  wickets: number;
  strikeRate: number;
  economy?: number;
  highestScore?: number;
  bestBowling?: string;
}

export interface Player {
  id: string;
  name: string;
  photoUrl: string;
  mobile?: string;
  role: PlayerRole;
  battingStyle: string;
  bowlingStyle: string;
  basePrice: number;
  category: PlayerCategory;
  stats: PlayerStats;
  status: PlayerStatus;
  soldToTeamId?: string;
  soldPrice?: number;
  lotOrder: number;
}

export interface Team {
  id: string;
  name: string;
  shortCode: string;
  logo: string;
  colorHex: string;
  ownerName: string;
  ownerMobile?: string;
  totalPurse: number;
  remainingPurse: number;
  rtmCardsLeft: number;
}

export interface BidSlab {
  fromAmount: number;
  toAmount: number;
  increment: number;
}

export interface AuctionRules {
  pursePerTeam: number;
  minPlayersPerTeam: number;
  maxPlayersPerTeam: number;
  currency: CurrencyType;
  bidSlabs: BidSlab[];
  rtmCardsPerTeam: number;
  allowNegativePurse: boolean;
  timerSeconds: number;
}

export interface BidRecord {
  id: string;
  playerId: string;
  teamId: string;
  teamName: string;
  amount: number;
  timestamp: number;
}

export interface Tournament {
  id: string;
  name: string;
  year: number;
  season: string;
  logoUrl?: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
}

export type ViewMode =
  | 'STAGE'
  | 'AUCTIONEER'
  | 'PADDLE'
  | 'PLAYERS'
  | 'TEAMS'
  | 'RULES'
  | 'SQUADS'
  | 'OBS';
