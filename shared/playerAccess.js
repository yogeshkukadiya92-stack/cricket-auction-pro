// Pure helpers for the player-facing (mobile-number login) area.
// Everything returned from here is safe to send to other players:
// mobile numbers, e-mail, payment details and custom form answers are never included.

export const PLAYER_PASSWORD_MIN = 8;
export const PLAYER_PASSWORD_MAX = 128;
export const PLAYER_ROLES = ['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA_IMAGE = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

export const isValidPlayerPassword = value =>
  typeof value === 'string' && value.length >= PLAYER_PASSWORD_MIN && value.length <= PLAYER_PASSWORD_MAX;

export const isUuid = value => typeof value === 'string' && UUID.test(value);

const isApproved = player => !player.approvalStatus || player.approvalStatus === 'APPROVED';

const safeStats = stats => ({
  matches: Number(stats?.matches) || 0,
  runs: Number(stats?.runs) || 0,
  wickets: Number(stats?.wickets) || 0,
  strikeRate: Number(stats?.strikeRate) || 0,
});

/** A tournament is "live" while it is marked LIVE or a lot is on the block. */
export function isLiveTournament(tournament, liveState) {
  return tournament?.status === 'LIVE' || !!liveState?.currentPlayerId;
}

export function toTournamentSummary(tournament) {
  return {
    id: tournament.id,
    name: tournament.name,
    season: tournament.season || '',
    year: tournament.year,
    status: tournament.status || 'UPCOMING',
    logoUrl: tournament.logoUrl || '',
    city: tournament.city || '',
    ground: tournament.ground || '',
    startDate: tournament.startDate || '',
    currency: tournament.rules?.currency || 'INR',
  };
}

export function toTeamSummary(team) {
  if (!team) return null;
  return { id: team.id, name: team.name, shortCode: team.shortCode || '', logo: team.logo || '', colorHex: team.colorHex || '#F59E0B' };
}

/** The signed-in player's own registration (includes approval and payment state). */
export function toRegistrationSummary({ player, tournament, team, liveState }) {
  return {
    playerId: player.id,
    tournament: toTournamentSummary(tournament),
    approvalStatus: player.approvalStatus || 'APPROVED',
    paymentStatus: player.paymentStatus || null,
    auctionStatus: player.status || 'AVAILABLE',
    basePrice: Number(player.basePrice) || 0,
    soldPrice: player.status === 'SOLD' ? Number(player.soldPrice) || 0 : null,
    team: player.status === 'SOLD' ? toTeamSummary(team) : null,
    registeredAt: player.registeredAt || null,
    isLive: isLiveTournament(tournament, liveState),
    isOnBlock: !!liveState?.currentPlayerId && liveState.currentPlayerId === player.id,
  };
}

/** Public cricket profile shown to every signed-in player. */
export function toPublicProfile(publicId, data) {
  return {
    id: publicId,
    name: data?.name || 'Player',
    role: PLAYER_ROLES.includes(data?.role) ? data.role : 'ALL_ROUNDER',
    battingStyle: data?.battingStyle || '',
    bowlingStyle: data?.bowlingStyle || '',
    city: data?.city || '',
    stats: safeStats(data?.stats),
    hasPhoto: !!data?.photoUrl,
  };
}

/** One tournament appearance in a public profile; only approved registrations are listed. */
export function toHistoryEntry({ player, tournament, team, liveState }) {
  if (!isApproved(player)) return null;
  return {
    tournament: toTournamentSummary(tournament),
    auctionStatus: player.status || 'AVAILABLE',
    basePrice: Number(player.basePrice) || 0,
    soldPrice: player.status === 'SOLD' ? Number(player.soldPrice) || 0 : null,
    team: player.status === 'SOLD' ? toTeamSummary(team) : null,
    isLive: isLiveTournament(tournament, liveState),
  };
}

export function decodeDataImage(value) {
  const match = typeof value === 'string' ? DATA_IMAGE.exec(value) : null;
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
}
