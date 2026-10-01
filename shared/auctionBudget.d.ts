import { Team, Player, AuctionRules } from '../src/types';
export function getBidBudget(team: Team, players: Player[], rules: AuctionRules): { bought: number; remainingSlots: number; reserve: number; maxBid: number };
