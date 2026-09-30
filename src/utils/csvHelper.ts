import { Player, PlayerRole, PlayerCategory } from '../types';

export const CSV_SAMPLE_HEADER =
  'Name,Role,Category,BasePrice,BattingStyle,BowlingStyle,Matches,Runs,Wickets,StrikeRate,PhotoUrl,Mobile';

export const CSV_SAMPLE_ROWS = [
  'Virat Kohli,BATSMAN,MARQUEE,100000,Right Hand Batsman,Right Arm Medium,250,7800,4,138.5,https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500,+919876543210',
  'Jasprit Bumrah,BOWLER,MARQUEE,100000,Right Hand,Right Arm Fast,140,120,165,115.0,https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500,+919876543211',
  'Ravindra Jadeja,ALL_ROUNDER,MARQUEE,90000,Left Hand Finisher,Slow Left Arm Orthodox,240,2950,160,129.0,https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500,+919876543212',
  'KL Rahul,WICKET_KEEPER,SET_A,80000,Right Hand Opener,N/A,135,4200,0,135.2,https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=500,+919876543213',
  'Mohit Sharma,BOWLER,SET_B,40000,Right Hand,Right Arm Fast Medium,110,95,124,102.0,https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=500,+919876543214',
].join('\n');

export function downloadSampleCsvTemplate() {
  const content = `${CSV_SAMPLE_HEADER}\n${CSV_SAMPLE_ROWS}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'cricket_auction_players_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportPlayersToCsv(players: Player[]) {
  const rows = players.map((p) => [
    `"${p.name.replace(/"/g, '""')}"`,
    p.role,
    p.category,
    p.basePrice,
    `"${(p.battingStyle || '').replace(/"/g, '""')}"`,
    `"${(p.bowlingStyle || '').replace(/"/g, '""')}"`,
    p.stats.matches,
    p.stats.runs,
    p.stats.wickets,
    p.stats.strikeRate,
    `"${p.photoUrl}"`,
    `"${p.mobile || ''}"`,
    p.status,
    p.soldPrice || '',
  ]);

  const header = `${CSV_SAMPLE_HEADER},Status,SoldPrice`;
  const csvContent = [header, ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `players_export_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCsvToPlayers(csvText: string, currentTotal: number): Player[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  // Skip header line
  const dataLines = lines.slice(1);
  const parsed: Player[] = [];

  dataLines.forEach((line, index) => {
    // Basic comma splitter handling quotes
    const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
    const matches = line.match(/(?:[^\s",]+|"[^"]*")+/g) || line.split(',');

    if (matches.length >= 4) {
      const clean = (val: string = '') => val.replace(/^"|"$/g, '').trim();

      const name = clean(matches[0]);
      if (!name) return;

      const rawRole = clean(matches[1]).toUpperCase();
      let role: PlayerRole = 'ALL_ROUNDER';
      if (rawRole.includes('BAT')) role = 'BATSMAN';
      else if (rawRole.includes('BOWL')) role = 'BOWLER';
      else if (rawRole.includes('KEEP') || rawRole.includes('WK')) role = 'WICKET_KEEPER';

      const rawCat = clean(matches[2]).toUpperCase();
      let category: PlayerCategory = 'SET_A';
      if (rawCat.includes('MARQUEE')) category = 'MARQUEE';
      else if (rawCat.includes('SET_B')) category = 'SET_B';
      else if (rawCat.includes('ACCEL')) category = 'ACCELERATED';

      const basePrice = Number(clean(matches[3])) || 25000;
      const battingStyle = clean(matches[4]) || 'Right Hand Batsman';
      const bowlingStyle = clean(matches[5]) || 'Right Arm Fast';
      const matchesCount = Number(clean(matches[6])) || 10;
      const runs = Number(clean(matches[7])) || 150;
      const wickets = Number(clean(matches[8])) || 5;
      const strikeRate = Number(clean(matches[9])) || 130.0;
      const photoUrl =
        clean(matches[10]) ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop&q=80';
      const mobile = clean(matches[11]) || '';

      parsed.push({
        id: `ply-csv-${Date.now()}-${index}`,
        name,
        photoUrl,
        mobile,
        role,
        category,
        basePrice,
        battingStyle,
        bowlingStyle,
        stats: {
          matches: matchesCount,
          runs,
          wickets,
          strikeRate,
        },
        status: 'AVAILABLE',
        lotOrder: currentTotal + index + 1,
      });
    }
  });

  return parsed;
}
