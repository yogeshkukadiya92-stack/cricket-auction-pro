export type PlayerRole = 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
export type PlayerCategory = 'MARQUEE' | 'SET_A' | 'SET_B' | 'ACCELERATED';
export type PlayerStatus = 'AVAILABLE' | 'IN_AUCTION' | 'SOLD' | 'UNSOLD';
export type CurrencyType = 'INR' | 'POINTS' | 'LAKHS' | 'USD';
export type ApprovalStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export type FormFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'textarea'
  | 'checkbox'
  | 'file';

export interface CustomFormField {
  id: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for 'select' dropdown
  helpText?: string;
  enabled: boolean;
}

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
  tournamentId?: string;
  name: string;
  photoUrl: string;
  mobile?: string;
  email?: string;
  city?: string;
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
  approvalStatus?: ApprovalStatus;
  registeredAt?: string;
  customData?: Record<string, any>;
  paymentScreenshotUrl?: string;
  paymentUtr?: string;
  paymentStatus?: 'PAID' | 'VERIFIED' | 'PENDING' | 'EXEMPT';
  paymentAmount?: number;
}

export interface Team {
  id: string;
  tournamentId?: string;
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
  bidIncrement?: number;
  minimumPlayerReserve?: number;
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
  rules?: AuctionRules;
  id: string;
  userId?: string;
  creatorEmail?: string;
  name: string;
  year: number;
  season: string;
  logoUrl?: string;
  sponsor?: string;
  coSponsors?: string;
  defaultBasePrice: number;
  startDate?: string;
  endDate?: string;
  ground?: string;
  city?: string;
  expectedTeamsCount?: number;
  ballType?: string;
  totalPursePerTeam?: number;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  registrationOpen?: boolean;
  registrationFee?: number;
  registrationDeadline?: string;
  instructions?: string;
  upiId?: string;
  gpayNumber?: string;
  gpayName?: string;
  gpayQrUrl?: string;
  paymentMandatory?: boolean;
  customFields?: CustomFormField[];
  sportType?: 'CRICKET' | 'FOOTBALL' | 'KABADDI' | 'VOLLEYBALL' | 'OTHER';
}

export type UserRole = 'ADMIN' | 'ORGANIZER' | 'USER';

export type AppPortal = 'ORGANIZER' | 'USER';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: UserRole;
  status: 'ACTIVE' | 'BLOCKED';
  createdAt?: string;
  tournamentsCount?: number;
  playerProfile?: Partial<Player>;
}

export type ViewMode =
  | 'TOURNAMENT_OVERVIEW'
  | 'TOURNAMENTS'
  | 'STAGE'
  | 'AUCTIONEER'
  | 'PADDLE'
  | 'PLAYERS'
  | 'TEAMS'
  | 'RULES'
  | 'SQUADS'
  | 'OBS'
  | 'FORM_BUILDER'
  | 'PUBLIC_REGISTER'
  | 'PUBLIC_SUMMARY'
  | 'PUBLIC_REGISTRATIONS'
  | 'ADMIN_PANEL'
  | 'USER_PORTAL'
  | 'PLAYER';

