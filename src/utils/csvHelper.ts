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
  URL.revokeObjectURL(url);
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
  URL.revokeObjectURL(url);
}

export function parseCsvRows(csvText: string): string[][] {
  // Read quoted commas, empty columns, escaped quotes and multiline fields.
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      if (quoted && csvText[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && csvText[i + 1] === '\n') i++;
      row.push(field); if (row.some(value => value.trim())) rows.push(row);
      row = []; field = '';
    } else field += char;
  }
  row.push(field); if (row.some(value => value.trim())) rows.push(row);
  if (quoted) throw new Error('CSV contains an unclosed quoted field');
  return rows;
}

export function parseCsvToPlayers(csvText: string, currentTotal: number): Player[] {
  const rows = parseCsvRows(csvText);
  const parsed: Player[] = [];
  rows.slice(1).forEach((matches, index) => {
    if (matches.length >= 4) {
      const clean = (val: string = '') => val.trim();
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

      const basePrice = Math.max(0, Number(clean(matches[3])) || 0);
      const battingStyle = clean(matches[4]) || 'Right Hand Batsman';
      const bowlingStyle = clean(matches[5]) || 'Right Arm Fast';
      const matchesCount = Math.max(0, Number(clean(matches[6])) || 0);
      const runs = Math.max(0, Number(clean(matches[7])) || 0);
      const wickets = Math.max(0, Number(clean(matches[8])) || 0);
      const strikeRate = Math.max(0, Number(clean(matches[9])) || 0);
      const photoUrl =
        clean(matches[10]) ||
        '/player-placeholder.svg';
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
        approvalStatus: 'APPROVED',
        lotOrder: currentTotal + index + 1,
      });
    }
  });

  return parsed;
}
