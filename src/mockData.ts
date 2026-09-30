import { Tournament, Team, Player, AuctionRules } from './types';

export const initialTournament: Tournament = {
  id: 'tourney-live-2026',
  name: 'Gujarat Premier League (GPL)',
  year: 2026,
  season: 'Season 7 (Live Auction)',
  status: 'LIVE',
  logoUrl: '',
  sponsor: 'Tata Projects',
  coSponsors: 'Dream11, Amul India, CEAT Tyres',
  defaultBasePrice: 20000,
  startDate: '2026-11-01',
  endDate: '2026-11-15',
  ground: 'Narendra Modi Stadium Ground A',
  city: 'Ahmedabad',
  expectedTeamsCount: 8,
  ballType: 'Heavy Tennis Ball',
  totalPursePerTeam: 1000000,
  registrationOpen: true,
  registrationFee: 500,
  registrationDeadline: '2026-10-15',
  instructions: 'Please provide a valid WhatsApp number and upload a clear passport-size photo. This photo will be displayed on the auction screen and digital player pass.',
  upiId: 'cricketgpl@oksbi',
  gpayNumber: '+91 98250 12345',
  gpayName: 'GPL Cricket Committee',
  gpayQrUrl: '',
  paymentMandatory: true,
  customFields: [
    {
      id: 'jersey_size',
      label: 'Jersey Size',
      type: 'select',
      options: ['S (Chest 36)', 'M (Chest 38)', 'L (Chest 40)', 'XL (Chest 42)', 'XXL (Chest 44)'],
      required: true,
      enabled: true,
      helpText: 'Select your size for the official tournament kit',
    },
    {
      id: 'jersey_name',
      label: 'Jersey Name (Printed on Back)',
      type: 'text',
      placeholder: 'e.g. PRIYESH',
      required: true,
      enabled: true,
      helpText: 'Write in CAPITAL letters',
    },
    {
      id: 'jersey_number',
      label: 'Preferred Jersey Number',
      type: 'number',
      placeholder: 'e.g. 7 or 18',
      required: false,
      enabled: true,
    },
    {
      id: 'player_city',
      label: 'City / District',
      type: 'text',
      placeholder: 'e.g. Surat, Rajkot, Ahmedabad, Vadodara',
      required: true,
      enabled: true,
    },
    {
      id: 'previous_club',
      label: 'Previous Team / Club',
      type: 'text',
      placeholder: 'e.g. Navrang Sports Club',
      required: false,
      enabled: true,
    },
    {
      id: 'emergency_mobile',
      label: 'Emergency Contact Mobile',
      type: 'text',
      placeholder: 'e.g. +91 98250 11223',
      required: false,
      enabled: true,
    },
  ],
};

export const initialRules: AuctionRules = {
  pursePerTeam: 1000000, // ₹10,00,000 (10 Lakhs)
  minPlayersPerTeam: 11,
  maxPlayersPerTeam: 15,
  currency: 'INR',
  bidSlabs: [
    { fromAmount: 0, toAmount: 50000, increment: 2000 },
    { fromAmount: 50000, toAmount: 200000, increment: 5000 },
    { fromAmount: 200000, toAmount: 500000, increment: 10000 },
    { fromAmount: 500000, toAmount: 2000000, increment: 25000 },
  ],
  rtmCardsPerTeam: 2,
  allowNegativePurse: false,
  timerSeconds: 15,
};

export const initialTeams: Team[] = [
  {
    id: 'team-ahd',
    name: 'Ahmedabad Lions',
    shortCode: 'AHD',
    logo: '🦁',
    colorHex: '#EF4444', // Red
    ownerName: 'Harshil Patel & Associates',
    ownerMobile: '+91 98250 12345',
    totalPurse: 1000000,
    remainingPurse: 1000000,
    rtmCardsLeft: 2,
  },
  {
    id: 'team-srt',
    name: 'Surat Super Kings',
    shortCode: 'SRT',
    logo: '👑',
    colorHex: '#F59E0B', // Gold
    ownerName: 'Dharmesh Diamond House',
    ownerMobile: '+91 98790 54321',
    totalPurse: 1000000,
    remainingPurse: 1000000,
    rtmCardsLeft: 2,
  },
  {
    id: 'team-rkt',
    name: 'Rajkot Royals',
    shortCode: 'RKT',
    logo: '⚔️',
    colorHex: '#3B82F6', // Royal Blue
    ownerName: 'Jayraj Jadeja',
    ownerMobile: '+91 99040 11223',
    totalPurse: 1000000,
    remainingPurse: 1000000,
    rtmCardsLeft: 2,
  },
  {
    id: 'team-bdq',
    name: 'Baroda Blasters',
    shortCode: 'BRD',
    logo: '⚡',
    colorHex: '#10B981', // Emerald
    ownerName: 'Kunal Gaekwad Sports',
    ownerMobile: '+91 97260 99887',
    totalPurse: 1000000,
    remainingPurse: 1000000,
    rtmCardsLeft: 2,
  },
  {
    id: 'team-ktc',
    name: 'Kutch Titans',
    shortCode: 'KTC',
    logo: '🌪️',
    colorHex: '#8B5CF6', // Purple
    ownerName: 'Bhavin Bhanushali',
    ownerMobile: '+91 99780 44556',
    totalPurse: 1000000,
    remainingPurse: 1000000,
    rtmCardsLeft: 2,
  },
];

// Completely clean for Live Production - No Demo Players!
export const initialPlayers: Player[] = [];

export const initialTournaments: Tournament[] = [initialTournament];
