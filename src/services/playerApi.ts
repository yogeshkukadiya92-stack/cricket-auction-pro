import { CurrencyType, PlayerRole, PlayerStatus, ApprovalStatus } from '../types';

export interface PlayerStats { matches: number; runs: number; wickets: number; strikeRate: number }

export interface PublicPlayerProfile {
  id: string | null;
  name: string;
  role: PlayerRole;
  battingStyle: string;
  bowlingStyle: string;
  city: string;
  stats: PlayerStats;
  hasPhoto: boolean;
}

export interface TournamentSummary {
  id: string;
  name: string;
  season: string;
  year?: number;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  logoUrl: string;
  city: string;
  ground: string;
  startDate: string;
  currency: CurrencyType;
}

export interface TeamSummary { id: string; name: string; shortCode: string; logo: string; colorHex: string }

export interface MyRegistration {
  playerId: string;
  tournament: TournamentSummary;
  approvalStatus: ApprovalStatus;
  paymentStatus: 'PAID' | 'VERIFIED' | 'PENDING' | 'EXEMPT' | null;
  auctionStatus: PlayerStatus;
  basePrice: number;
  soldPrice: number | null;
  team: TeamSummary | null;
  registeredAt: string | null;
  isLive: boolean;
  isOnBlock: boolean;
}

export interface PlayerMe {
  player: PublicPlayerProfile & { mobile: string };
  registrations: MyRegistration[];
}

export interface DirectoryPlayer extends PublicPlayerProfile {
  id: string;
  appearances: number;
  soldCount: number;
  inLiveTournament: boolean;
}

export interface DirectoryPage { players: DirectoryPlayer[]; total: number; page: number; hasMore: boolean }

export interface HistoryEntry {
  tournament: TournamentSummary;
  auctionStatus: PlayerStatus;
  basePrice: number;
  soldPrice: number | null;
  team: TeamSummary | null;
  isLive: boolean;
}

export interface PlayerProfileDetail {
  isMe: boolean;
  player: PublicPlayerProfile & { id: string };
  summary: { tournaments: number; sold: number; unsold: number };
  history: HistoryEntry[];
}

export type AuthNextStep = 'LOGIN' | 'SETUP' | 'NOT_REGISTERED' | 'BLOCKED';

export class PlayerApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', ...init });
  } catch {
    throw new PlayerApiError('No internet connection. Please check your network and try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new PlayerApiError(data.error || 'Something went wrong. Please try again.', res.status);
  return data as T;
}

const post = <T>(url: string, body: unknown) =>
  request<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const playerApi = {
  check: (mobile: string) => post<{ next: AuthNextStep }>('/api/player/auth/check', { mobile }),
  setup: (mobile: string, password: string) => post('/api/player/auth/setup', { mobile, password }),
  login: (mobile: string, password: string) => post('/api/player/auth/login', { mobile, password }),
  logout: () => post('/api/player/auth/logout', {}),
  changePassword: (currentPassword: string, newPassword: string) => post('/api/player/auth/password', { currentPassword, newPassword }),
  me: () => request<PlayerMe>('/api/player/me'),
  directory: (params: { q?: string; role?: string; page?: number }, signal?: AbortSignal) => {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.role) search.set('role', params.role);
    if (params.page) search.set('page', String(params.page));
    return request<DirectoryPage>(`/api/players?${search}`, { signal });
  },
  profile: (id: string) => request<PlayerProfileDetail>(`/api/players/${encodeURIComponent(id)}`),
  photoUrl: (id: string | null) => (id ? `/api/players/${encodeURIComponent(id)}/photo` : ''),
};
